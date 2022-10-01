// This test expects a clean JanD installation.
// It will function on an existing JanD instance, but note that it might cause some funnys.

const jand = require('./index.js');
const client = new jand.JandIpcClient();

client.DEBUG = true

beforeAll(() => {
    return client.connect()
})

afterAll(() => {
    client.exit()
})

describe('JanD Daemon', () => {

    test('Connect to jand ipc', async () => {
        expect(client.connected).toBe(true);
    })

    test('Get daemon status', async () => {
        const status = await client.getDaemonStatus()
        expect(status).toHaveProperty('Processes')
        expect(status).toHaveProperty('NotSaved')
        expect(status).toHaveProperty('Directory')
        expect(status).toHaveProperty('Version')
    })
})

describe('JanD Process', () => {
    test('Create a test process', async () => {
        const { length } = await client.getRuntimeProcessList()
        await client.newProcess({
            Name: 'foo',
            Filename: 'node',
            Arguments: ['test/test-server.js'],
        })
        const processes = await client.getRuntimeProcessList()
        expect(processes.length).toBe(length + 1);
    })

    test('Start the process', async () => {
        await client.restartProcess('foo')
        const process = await client.getProcessInfo('foo')
        expect(process.Running).toBe(true)
    })

    test('Get process info', async () => {
        const process = await client.getProcessInfo('foo')
        expect(process).toHaveProperty('Name')
        expect(process).toHaveProperty('Filename')
        expect(process).toHaveProperty('Arguments')
        expect(process).toHaveProperty('Running')
        expect(process).toHaveProperty('ProcessId')
    })

    test('Rename process', async() => {
        await client.renameProcess('foo', 'bar')
        const process = await client.getProcessInfo('bar')
        expect(process.Name).toBe('bar')
    })

    test('Remove the test process', async () => {
        const { length } = await client.getRuntimeProcessList()
        await client.deleteProcess('bar')
        const processes = await client.getRuntimeProcessList()
        expect(processes.length).toBe(length - 1);
    })
})

describe('JanD Events', () => {
    test('Subcribe to events', async () => {
        await client.subscribe(['procstart', 'procadd', 'procstop', 'procren', 'procdel'])
        expect(client.expectsEventFlags).toBe(0b0111_1100)
    })

    test('procadd event', async() => {
        return new Promise(async (resolve, reject) => {
            await client.newProcess({
                Name: 'foo',
                Filename: 'node',
                Arguments: ['test/test-server.js'],
            })
            client.on('procadd', data => {
                resolve(data)
                expect(data).toHaveProperty('Process')
                expect(data.Process).toBe('foo')
            })
        })
        
    })
    
    test('procdel event', async () => {
        return new Promise(async (resolve, reject) => {
            await client.deleteProcess('foo')
            client.on('procdel', data => {
                resolve(data)
                expect(data).toHaveProperty('Process')
                expect(data.Process).toBe('foo')
            })
        })
    })
})