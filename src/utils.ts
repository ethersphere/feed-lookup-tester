import { Bytes } from "@ethersphere/bee-js/dist/src/utils/bytes"

/**
 * Utility function for generating random Buffer
 * !!! IT IS NOT CRYPTO SAFE !!!
 * For that use `crypto.randomBytes()`
 *
 * @param length Number of bytes to generate
 * @param seed Seed for the pseudo-random generator
 */
 export function randomByteArray(length: number, seed = 500): Uint8Array {
  const rand = lrng(seed)
  const buf = new Uint8Array(length)

  for (let i = 0; i < length; ++i) {
    buf[i] = (rand() * 0xff) << 0
  }

  return buf
}

/**
 * Lehmer random number generator with seed (minstd_rand in C++11)
 * !!! Very fast but not well distributed pseudo-random function !!!
 *
 * @param seed Seed for the pseudo-random generator
 */
 function lrng(seed: number): () => number {
  return (): number => ((2 ** 31 - 1) & (seed = Math.imul(48271, seed))) / 2 ** 31
}

/**
 * Returns a new byte array filled with zeroes with the specified length
 *
 * @param length The length of data to be returned
 */
 export function makeBytes<Length extends number>(length: Length): Bytes<Length> {
  return new Uint8Array(length) as Bytes<Length>
}

export function feedIndexBeeResponse(index: number): string {
  return index.toString(16).padStart(16, '0')
}

export function incrementBytes(bytes: Uint8Array): void {
  for(let i = bytes.length - 1; i >= 0; i--) {
    if(bytes[i] < 255) {
      bytes[i]++
      break
    }
  }
}
