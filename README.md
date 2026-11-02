# Anthropic Experiments

A collection of small projects used to experiment with the Anthropic SDK, MCP, RAG pipelines and related tooling. Each subfolder is an independent project with its own dependencies.

## Structure

| Folder | Description |
| --- | --- |
| [`mcp`](./mcp) | Small project with an MCP client and an MCP server. The client spawns the server as a child process and uses a Claude model with the server's tools to manage content on a CMS. |
| [`rag-ts`](./rag-ts) | Small RAG project written in TypeScript, using a local vector DB to search document chunks. It combines vector search and BM25 with reciprocal rank fusion, reranks the results and passes the top documents to an LLM to produce a contextualized answer. |
| [`skills`](./skills) | Project that defines an Anthropic skill. **Work in progress.** |
| [`agent`](./agent) | Project for experimenting with Anthropic's client tools. |
| [`sdk`](./sdk) | A set of small scripts used only to get familiar with the Anthropic SDK. |

## Getting started

Each project has its own setup and usage instructions. Check the README inside the project folder (where available) for requirements, environment variables and commands.
