# <div style="font-size: 4em">🔱</div> isomorphic actions

### A no-overhead approach to server-side functions that run from the browser

When creating web apps you have to communicate between the server and browser for everything – authentication, forms, data fetching, etc. There are a lot decisions and overhead to get your server up and running that isn't necessary for most applications. Isomorphic actions takes a no-overhead approach, so you can write server-side functions next to your client side code side, and run them like any function.

### Why use isomorphic actions?

* 💝**Intuitive:** actions run identically on the server and in the browser - exactly as you'd expect them to
* 💢**Native Errors:** Errors are thrown natively – no special handling to learn
* 🔌**Framework Plugins:** Plugins for popular frameworks including [Next.js](#) and [Gatsby](#)

```jsx
/** this runs on the server */
export const getFile = createSimpleAction(async function (file) {
  return fs.readFile('/path/to/files/'+file, 'utf8')
})

/** this runs in the browser */
export default function({ content = '' }) {
  const [text, setText] = useState(content)
  
  async function handleClick() {
    setText('')
    try {
      const content = await getFile('README.md')
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


### How does it work?

INSERT DIAGRAM


## Getting Started

### Configuration: Next.js

### Configuration: Gatsby

### Configuration: Do it yourself

## Actions

### defineAction

- create an action
  - single param - context
  - may only appear at the top level
  - returns { results, headers, status }
- run an action

### Error handling

- throwing errors
- http status
  - default
  - overriding 
- IsomorphicError
  - status
  - data

### File uploads



## Middleware

- pipe function


## Hooks

## Advanced

- using req and res






This project was inspired by `getServerSideProps` in [Next.js](http://nextjs.org/)