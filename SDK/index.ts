import { main as standardCallMain} from "./exercises/standardCall.ts";
import { main as streamCallMain } from "./exercises/streamCall.ts";
import { main as toolHelpersMain } from "./exercises/toolHelpers.ts";
import { main as cachePromptMain } from "./exercises/cachePrompt.ts";
import { main as multiMessageMain } from "./exercises/multiMessage.ts";
import { main as withImageMain } from "./exercises/withImage.ts";

const exercise = process.argv[2]

switch(exercise){
    case 'standard':
        standardCallMain()
        break
    case 'stream':
        streamCallMain()
        break
    case 'tool':
        toolHelpersMain()
        break
    case 'cache':
        cachePromptMain()
        break
    case 'multi':
        multiMessageMain()
        break
    case 'image':
        withImageMain()
        break
    default:
        console.log('Exercise not implemented')
        break
}