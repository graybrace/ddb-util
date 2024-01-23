# ddb-util
Utilities for managing data in DynamoDB tables in simplified scenarios

## Usage

### Get Table Data
Retrieve all table data and store in local archive

`ddbu get <TABLE> <path/to/archive.tar>`

### Insert Table Data
Insert all data from local archive to table

`ddbu insert <TABLE> <path/to/archive.tar>`

This command is meant to process archives created from the `get` command. It uses the [BatchWriteItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html) command to put all data items in to the table, so it will overwrite pre-existing items with the same keys.

## Note
This package has been developed for ad-hoc use and has yet to be tested on large data sets or formally published.

## License
Licensed under MIT
