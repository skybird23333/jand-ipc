// This test expects a clean JanD installation.

const jand = require('./index.js');

const client = new jand.JandIpcClient();

beforeAll(() => {
    return client.connect()
})

afterAll(() => {
    client.exit()
})

test('Connect to jand ipc', async() => {
    expect(client.connected).toBe(true);
})

test('Get daemon status', async() => {
    const status = await client.getDaemonStatus()
    expect(status).toHaveProperty('Processes')
    expect(status).toHaveProperty('NotSaved')
    expect(status).toHaveProperty('Directory')
    expect(status).toHaveProperty('Version')
})