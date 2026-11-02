# MCP Client/Server

A small client/server project built on the Model Context Protocol (MCP). The client spawns the MCP server as a child process and uses a Claude model, together with the tools exposed by the server, to manage content on a CMS.

> **Note:** for now the project can only be run directly on the host with Node.js. Docker and other containerization technologies are not supported yet.

## Requirements

- Node.js **25 or higher**
- npm

## Installation

```bash
npm i
```

## Build

```bash
npm run build
```

This builds both the client and the server and copies the required resources into the build directory.

## Environment variables

The following environment variables must be set before running the project.

### CMS

| Variable | Description |
| --- | --- |
| `CMS` | Name of the CMS to use (default: `contentstack`). |
| `CMS_API_KEY` | API key of the CMS. |
| `CMS_MNG_TOKEN` | Management token of the CMS. |

`CMS_API_KEY` and `CMS_MNG_TOKEN` are specific to Contentstack. Other CMS implementations may require different information.

### Model

| Variable | Description |
| --- | --- |
| `MODEL` | The Claude model to use. |
| `MODEL_KEY` | The API key passed to the SDK. |
| `MODEL_SRC_PATH` | Absolute path where the agent looks for the information about the components to be mapped. |

### Langfuse

| Variable | Description |
| --- | --- |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key. |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key. |
| `LANGFUSE_BASE_URL` | Langfuse base URL. |

These three variables are read directly by the Langfuse SDK and can be retrieved from the dashboard on the Langfuse web platform.

## Usage

```bash
npm run start-client ./build/server/src/index.js
```

This starts the MCP client. The path to the compiled server entry point (`index.js`) is passed as an argument, and the client uses it to spawn the MCP server process.

## Extending the project

To extend the model's knowledge and/or add support for another CMS:

1. **Create the CMS class.** In the server, create a class that extends `AbstractCms` and implement the tools needed to handle the different activities the agent can perform.
2. **Register the tools.** Register the new tools on the server inside `createServer`.
3. **Add the client case.** Add a new `case` to the `switch` in `spawnCmsClient`.
4. **Add the model instructions.** Add a new file under `server/resources` containing the logic the model needs to understand how to use the CMS. The MCP server will pass those informations during the connection handshake and the LLM will threat them as its system prompt.
5. **Set the `CMS` variable.** Set the `CMS` environment variable to the name you chose to identify the new CMS client.
6. **Rebuild and restart.**

   ```bash
   npm run build
   npm run start-client ./build/server/src/index.js
   ```
