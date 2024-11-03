import url = require('url');
import http = require('http');
import fs = require('fs');
import path = require('path');
import opener = require('opener');
import * as chalk from 'chalk';
import * as os from 'os';
import { out } from '../../interaction-output';
import { StallionApiClient } from '../../apis/api-client';

let isRead = false
export async function startAuthServer() {
    const BASE_PORT = 3001;
    const MAX_PORT = 3100;

    try {
        const port = await findOpenPort(BASE_PORT, MAX_PORT);
        const server = http.createServer(async (req, res) => {
            if(isRead) {
                return
            }
            isRead = true
            const queryObject = url.parse(req.url, true).query;
        
            if (queryObject.token) {
                out.text(`${os.EOL}Authentication successful! Token:`);
                out.text(chalk.bold(`${queryObject.token}`));
                const client = new StallionApiClient();
                try {
                    await client.get('/auth/user-profile', {
                        'x-access-token': queryObject.token
                    });
                } catch (e) {
                    serveHTMLFile(res, path.join(__dirname, '../../sources/error.html'));
                    throw Error('AUTH_TOKEN_ERROR');
                }

                serveHTMLFile(res, path.join(__dirname, '../../sources/success.html'));
                // Close the server once we receive the token
                server.close();
            } else {
                serveHTMLFile(res, path.join(__dirname, '../../sources/error.html'));
                throw Error('AUTH_TOKEN_ERROR');
            }
        });

        // Start the server on the found port
        server.listen(port, () => {
            // Open the authentication page in the default browser with the callback URL
            const callbackUrl = `http://localhost:${port}`;
            opener(`http://localhost:3000/dashboard/cli/user?callback=${encodeURIComponent(callbackUrl)}`);
        });
    } catch (error) {
        throw error;
    }
}

function checkPort(port: number) {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false); // Port is in use
            } else {
                reject(err); // Other errors
            }
        });
        server.once('listening', () => {
            server.close(() => resolve(true)); // Port is free
        });
        server.listen(port);
    });
}

// Function to find an open port
async function findOpenPort(startPort: number, endPort: number) {
    for (let port = startPort; port <= endPort; port++) {
        const isAvailable = await checkPort(port);
        if (isAvailable) return port;
    }
    throw new Error('No available ports');
}

function serveHTMLFile(res: http.ServerResponse<http.IncomingMessage>, filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
}
