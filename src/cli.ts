#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from "yargs/helpers";
import { getDynamoData } from "./command/get";
import { insertDynamoData } from "./command/insert";

interface CommandInput {
    table: string
    file: string
}

yargs(hideBin(process.argv))
    .command<CommandInput>([ 'get <table> <file>' ], 'get table data', yargs => {
        yargs
            .positional('table', {
                describe: 'Table to get data from',
                type: 'string'
            })
            .positional('file', {
                describe: 'File to populate with CSV data',
                type: 'string'
            })
    }, async(argv) => {
        console.debug('get', argv.table, argv.file)
        await getDynamoData(argv.table, argv.file)
    })
    .command<CommandInput>([ 'insert <table> <file>' ], 'insert table data', yargs => {
        yargs
            .positional('table', {
                describe: 'Table to insert data into',
                type: 'string'
            })
            .positional('file', {
                describe: 'File to extract CSV data from',
                type: 'string'
            })
    }, async(argv) => {
        console.debug('insert', argv.table, argv.file)
        await insertDynamoData(argv.table, argv.file)
    })
    .help()
    .parse()