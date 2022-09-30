// This test expects a clean JanD installation.

const jand = require('./index.js');

const client = new jand.JandIpcClient();

test('Connect to jand ipc', async() => {
    await client.connect()
    expect(client.connected).toBe(true);
})

test('Exit jand', async() => {
    await client.exit()
    expect(client.connected).toBe(false);
})