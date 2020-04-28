# <div style="font-size: 4em">🔱</div> isomorphic actions

### A no-overhead approach to server-side functions that run from the browser

When creating web apps you have to communicate between the server and browser for everything – authentication, forms, data fetching, etc. There are a lot decisions and overhead to get your server up and running that isn't necessary for most applications. Isomorphic actions takes a no-overhead approach, so you can write server-side functions next to your client side code side, and run them like any function.

### Example

```jsx
import { createAction } from 'isomorphic-actions'
/** this runs on the server */
export const getFile = createAction(async ({ data: { file } }) => {
  return fs.readFile('/path/to/files/'+file, 'utf8')
})

/** this runs in the browser */
export default function({ content = '' }) {
  const [text, setText] = useState(content)
  
  async function handleClick() {
    setText('')
    try {
      const content = await getFile({ data: { file: 'README.md'} })
      setText(content)
    }
    catch(e) {
      console.log(e)
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Load file from server</button>
      <pre>{text}</pre>
    </div>
  )
}
```



## Getting Started

### Configuration: Next.js

##### 1. Add the configuration to your next.config.js

```js
const withIsomorphicActions = require('isomorphic-actions/next')()

module.exports = withIsomorphicActions({
  // add your next.config.js config here
})
```


##### 2. Create an API route in your pages

The file path should be `pages/actions/[id].js`. It should have the following content.

```js
export server, { config } from 'isomorphic-actions/server'

export default server({ output: process.env.ISOMORPHIC_ACTIONS_OUTPUT })
export { config }
```


##### 3. Create your first action


In any page or component you can now import `createAction` from `isomorphic-actions` and create your first action.

```js
import { createAction } from 'isomorphic-actions'

const hello = createAction(async () => 'hello from the server')

export default () => {
  return <button onClick={async () => alert(await hello())}>click me</button>
} 