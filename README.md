# Feed Lookup Tester

The script pushes Feed updates on the given Bee node and tries to fetch it from another one.

## Usage

### Installation

This is a node.js project. Node v14.16 or later required.

```
npm install
```

### Running

Run the script:

```
npm run start -- [OPTION] [OPTION...]
```

### Options

- `--bee-writer`: Bee node URL that pushes the feeds to the network.
- `--bee-reader`: reader Bee node URL that tries to fetch the latest uploaded feed update
- `--stamp`: used postage batch ID on the Bee writer node
- `--updates`: how many feed updates will be generated
- `--topic-seed`: From what seed the random topic will be generated
- `--download-iteration`: Attempt to download the feed from the other Bee client on every given amount of feed update
- `--help`: help menu
