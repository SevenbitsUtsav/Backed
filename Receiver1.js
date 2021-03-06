const { Client } = require('pg');
const db = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'Backed',
    password: 'Admin@123',
    port: 5432,
});
db.connect();
var Web3 = require('web3');
var provider = 'https://kovan.infura.io/v3/28ce60208dbf4adbb7ba05465f166e96';
var web3Provider = new Web3.providers.HttpProvider(provider);
var web3 = new Web3(web3Provider);
//var account = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'.toLowerCase();
function getLastSyncedBlock() {
    return new Promise(function(resolve, reject) {
        db.query(`SELECT number from blocks order by number DESC LIMIT 1`,
            function(error, result) {
                console.debug(error, result);
                if (error || !result) {
                    console.error('[DB] errored in getting last block.');
                    return reject(error);
                } else if (result.length == 0) {
                    console.debug(`[DB] there is no any block.`);
                    return resolve(0);
                } else {
                    console.log(result)
                    console.debug('[DB] got the last processed block', result.rows);
                    return resolve(result.rows);
                }
            });
    });
};



function checkaddress(adr) {
    return new Promise(function(resolve, reject) {
        console.log(adr, 'test')
        db.query(`SELECT address FROM clientsaddress WHERE address = '${adr}'`,
            function(error, result) {
                // console.log(result)
                //console.debug(error, result);
                if (result.rowCount == 0) {
                    //console.debug(`[DB] there is no any address.`);
                    return resolve(false);
                } else {
                    //console.log(result)
                    //console.debug('address:', result);
                    return resolve(true);
                }
            });

    });
}
async function insertBlocksandtrans() {
    try {
        var a = await getLastSyncedBlock();
        const LastBlockDB = a[0].number + 1; //27794900 //2800812
        console.log(LastBlockDB)
        var LatestBlock = await web3.eth.getBlockNumber() //27794904
        console.log('letest block number ', LatestBlock)
        for (let i = LastBlockDB; i < LatestBlock; i++) {
            console.log('\x1b[36m%s\x1b[0m', "This si the block running " + i);
            let block = await web3.eth.getBlock(i);
            //Get hash from the existing data in database. Also check previous hash.
            //Insert new block with process 0
            let number = block.number
                //console.log(block)
                // console.log('serching block ' + number);
                // console.log('current block have a ', block.transactions.length, 'transactions')
            if (block && block.transactions) {
                for (let txHash of block.transactions) {
                    console.log('\x1b[36m%s\x1b[0m', "This si the block running " + block.number);
                    let tx = await web3.eth.getTransaction(txHash);
                    //console.log(tx)

                    var account = await checkaddress(tx.to)
                    if (account) {
                        // console.log(`Transaction found on block ${ number }`);
                        // console.log(`Address is ${ tx.to }`);
                        // console.log('value is ', web3.utils.fromWei(tx.value, 'ether'), ' Ether'),
                        //     console.log(`Timestamp is ${ new Date() }`)
                        // console.log(tx.hash)
                        let recipent = await web3.eth.getTransactionReceipt(tx.hash)
                        console.log(recipent.status)
                        new Promise(function(resolve, reject) {
                            const sqlQuery2 = `INSERT INTO transaction (hash, blockNumber, BlockHash, "from", "to", amount, gasPrice, transactionIndex,gas, nonce, status) VALUES`;
                            const sqlQuery3 = sqlQuery2 + `('${tx.hash}', ${tx.blockNumber}, '${tx.blockHash}', '${tx.from}', '${tx.to}', '${web3.utils.fromWei(tx.value)}', '${tx.gasPrice}', '${tx.transactionIndex}','${tx.gas}', '${tx.nonce}', '${recipent.status}')`
                            console.debug("sqlQuery3", sqlQuery3);
                            db.query(sqlQuery3,
                                function(error, result) {
                                    //console.debug(error, result);
                                    if (error || !result) {
                                        // console.error();
                                        return reject(error);
                                    } else {
                                        console.debug('[DB] Transaction inserted into table, affectedRows:', result.rowCount);
                                        return (result);
                                    }


                                })
                        })
                    }


                    new Promise(function(resolve, reject) {
                        const sqlQuery1 = `INSERT INTO blocks (number, hash, "parentHash", "blockTimestamp") VALUES ('${block.number}', '${block.hash}', '${block.parentHash}','${block.timestamp}')`
                        console.debug("sqlQuery1", sqlQuery1);
                        db.query(sqlQuery1,
                            function(error, result) {
                                // console.debug(error, result);
                                if (error || !result) {
                                    console.error();
                                    //(error);
                                } else {
                                    console.debug('[DB] Block inserted into table affectedRows:', result.rowCount);
                                    // return (result);
                                }
                            }
                        )

                    })
                }


            }

        }


    } catch (err) {
        console.log(err)
    }
};
insertBlocksandtrans()