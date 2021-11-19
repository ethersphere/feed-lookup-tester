#!/usr/bin/env node

import { Bee, Utils } from '@ethersphere/bee-js'
import { ChunkReference } from '@ethersphere/bee-js/dist/src/feed'
import { FetchFeedUpdateResponse } from '@ethersphere/bee-js/dist/src/modules/feed'
import ora from 'ora'
import yargs from 'yargs'
import { feedIndexBeeResponse, incrementBytes, makeBytes, randomByteArray } from './utils'

const zeros64 = '0000000000000000000000000000000000000000000000000000000000000000'
const syncPollingTime = 1000 //in ms
const syncPollingTrials = 15

export const testIdentity = {
  privateKey: '634fb5a872396d9693e5c9f9d7233cfa93f395c093371017ff44aa9ae6564cdd',
  publicKey: '03c32bb011339667a487b6c1c35061f15f7edc36aa9a0f8648aba07a4b8bd741b4',
  address: '8d3766440f0d7b949a5e32995d09619a7f86e632',
}

function fetchDataCheck(updateFetch: FetchFeedUpdateResponse, expectedFeedRef: ChunkReference, expectedFeedIndex: number) {
  const beeFeedIndex = feedIndexBeeResponse(expectedFeedIndex)
  const feedRef =  Utils.bytesToHex(expectedFeedRef)

  if(updateFetch.feedIndex !== beeFeedIndex || feedRef !== updateFetch.reference) {
    throw Error(`Downloaded feed payload or index has not the expected result.`
      + `\n\tindex| expected: "${beeFeedIndex}" got: "${updateFetch.feedIndex}"`
      + `\n\treference| expected: "${feedRef}" got: "${updateFetch.reference}"`)
  }
}

async function waitSyncing(bee: Bee, tagUid: number): Promise<void | never> {
  const pollingTime = syncPollingTime
  const pollingTrials = syncPollingTrials
  let synced = false
  let syncStatus = 0

  for (let i = 0; i < pollingTrials; i++) {
    const tag = await bee.retrieveTag(tagUid)

    if (syncStatus !== tag.synced) {
      i = 0
      syncStatus = tag.synced
    }

    if (syncStatus >= tag.total) {
      synced = true
      // FIXME: after successful syncing the chunk is still not available.
      await new Promise(resolve => setTimeout(resolve, 500))
      break
    }
  }

  if (!synced) {
    throw new Error('Data syncing timeout.')
  }
}

// eslint-disable-next-line @typescript-eslint/no-extra-semi
;(async function root() {
  const argv = await yargs(process.argv.slice(2))
    .usage('Usage: <some STDOUT producing command> | $0 [options]')
    .option('bee-writer', {
      alias: 'b1',
      type: 'string',
      describe: 'Writer Bee node URL. By default Gateway 9 is used.',
      default: 'https://bee-9.gateway.ethswarm.org'
    })
    .option('bee-reader', {
      alias: 'b2',
      type: 'string',
      describe: 'Reader Bee node URL. By default Gateway 8 is used.',
      default: 'https://bee-8.gateway.ethswarm.org'
    })
    .option('stamp', {
      alias: 'st',
      type: 'string',
      describe: 'Postage Batch Stamp ID for bee-writer. By default it is zeros',
      default: zeros64
    })
    .option('updates', {
      alias: 'x',
      type: 'number',
      describe: 'How many updates the script will do',
      default: 2
    })
    .option('topic-seed', {
      alias: 't',
      type: 'number',
      describe: 'From what seed the random topic will be generated',
      default: 10
    })
    .option('download-iteration', {
      alias: 'di',
      type: 'number',
      describe: 'Attempt to download the feed from the other Bee client on every given amount of feed update',
      default: 1
    })
    .help('h')
    .alias('h', 'help').epilog(`Testing Ethereum Swarm Feed lookup time`).argv

  const beeWriterUrl = process.env.BEE_API_URL || argv['bee-writer']
  const beeReaderUrl = process.env.BEE_PEER_API_URL || argv['bee-reader']
  const stamp = process.env.BEE_STAMP || argv.stamp
  const updates = argv.updates
  const topicSeed = argv['topic-seed']
  const downloadIteration = argv['download-iteration']
  if(downloadIteration > updates) {
    throw new Error(`Download iteration ${downloadIteration} is higher than the feed update count: ${updates}`)
  }

  const beeWriter = new Bee(beeWriterUrl)
  const beeReader = new Bee(beeReaderUrl)

  const topic = randomByteArray(32, topicSeed)
  const feedWriter = beeWriter.makeFeedWriter('sequence', topic, testIdentity.privateKey)
  const feedReader = beeReader.makeFeedReader('sequence', topic, testIdentity.address)

  // reference that the feed refers to
  const reference = makeBytes(32) // all zeroes
  let downloadIterationIndex = 0

  for(let i = 0; i < updates; i++) {
    let startTime = new Date().getTime()
    const spinner = ora(`Upload feed for index ${i}`)
    spinner.start()
    
    // create tag for the full sync
    // const tag = await beeWriter.createTag()
    // await feedWriter.upload(stamp, reference, { tag: tag.uid })
    await feedWriter.upload(stamp, reference)
    const uploadTime = new Date().getTime() - startTime

    if(++downloadIterationIndex === downloadIteration) {
      downloadIterationIndex = 0

      startTime = new Date().getTime() 
      spinner.text = `Wait for feed update sync at index ${i}`
      // await waitSyncing(beeWriter, tag.uid)
      await new Promise(resolve => setTimeout(resolve, 40000))
      const syncingTime = new Date().getTime() - startTime

      spinner.text = `Download feed for index ${i}`
  
      startTime = new Date().getTime() 
      const firstUpdateFetch = await feedReader.download()
      const downloadTime = new Date().getTime() - startTime
  
      fetchDataCheck(firstUpdateFetch, reference, i)
  
      spinner.text = `Feed update ${i} fetch was successful`
      spinner.stopAndPersist()
  
      console.log(`\tUpload Time: ${uploadTime / 1000}s`
        + `\n\tSyncing time: ${syncingTime / 1000}s`
        + `\n\tFetch time: ${downloadTime / 1000}s`
      )
    } else {
      spinner.text = `Feed update ${i} fetch was successful`
      spinner.stopAndPersist()
  
      console.log(`\tUpload Time: ${uploadTime / 1000}s`)
    }

    incrementBytes(reference)
  }
})()