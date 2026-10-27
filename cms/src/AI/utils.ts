import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const readFile = async (filePath: string): Promise<string> => {
    let result: string = ''
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const coolPath = path.join(__dirname, filePath);
    const readStream = fs.createReadStream(coolPath);
    try {
        for await (const chunk of readStream) {
            result += chunk;
        }
        return result;
    } catch (error) {
        throw error;
    } finally {
        readStream.close();
    }
}

export const writeFile = async (filePath: string, line: string): Promise<void> => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const coolPath = path.join(__dirname, filePath);
    const writeStream = fs.createWriteStream(coolPath, { flags: 'a' });
    writeStream.write(line, (error) => {
        console.log(error);
        writeStream.close();
    });
}