import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that contract owner can add a property",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("123 Main St")], deployer.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Ensure that non-owner cannot add a property",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user = accounts.get('wallet_1')!;
        const block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("456 Elm St")], user.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(100);
    },
});

Clarinet.test({
    name: "Ensure that property owner can tokenize a property",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("789 Oak St")], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);

        block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'tokenize-property', [types.uint(0), types.uint(1000)], deployer.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Ensure that non-owner cannot tokenize a property",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("101 Pine St")], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);

        block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'tokenize-property', [types.uint(0), types.uint(1000)], user.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectErr().expectUint(102);
    },
});

Clarinet.test({
    name: "Ensure that users can buy property tokens",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("202 Maple St")], deployer.address),
            Tx.contractCall('real-estate-tokenization', 'tokenize-property', [types.uint(0), types.uint(1000)], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);
        block.receipts[1].result.expectOk().expectBool(true);

        block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'buy-tokens', [types.uint(0), types.uint(10)], user.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Ensure that users cannot buy more tokens than available",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("303 Cedar St")], deployer.address),
            Tx.contractCall('real-estate-tokenization', 'tokenize-property', [types.uint(0), types.uint(1000)], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);
        block.receipts[1].result.expectOk().expectBool(true);

        block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'buy-tokens', [types.uint(0), types.uint(1001)], user.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectErr().expectUint(102);
    },
});

Clarinet.test({
    name: "Ensure that property details can be retrieved",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("404 Birch St")], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);

        const propertyDetails = chain.callReadOnlyFn('real-estate-tokenization', 'get-property', [types.uint(0)], deployer.address);
        propertyDetails.result.expectSome().expectTuple({
            'owner': deployer.address,
            'price': types.uint(100000),
            'location': types.ascii("404 Birch St"),
            'tokenized': types.bool(false)
        });
    },
});

Clarinet.test({
    name: "Ensure that property token details can be retrieved",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        let block = chain.mineBlock([
            Tx.contractCall('real-estate-tokenization', 'add-property', [types.uint(100000), types.ascii("505 Willow St")], deployer.address),
            Tx.contractCall('real-estate-tokenization', 'tokenize-property', [types.uint(0), types.uint(1000)], deployer.address)
        ]);
        block.receipts[0].result.expectOk().expectUint(0);
        block.receipts[1].result.expectOk().expectBool(true);

        const tokenDetails = chain.callReadOnlyFn('real-estate-tokenization', 'get-property-tokens', [types.uint(0)], deployer.address);
        tokenDetails.result.expectSome().expectTuple({
            'total-supply': types.uint(1000),
            'tokens-remaining': types.uint(1000)
        });
    },
});