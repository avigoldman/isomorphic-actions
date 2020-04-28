const { transform } = require("@babel/core");

const trim = (s) => s.join("\n").trim().replace(/^\s+/gm, "");

const plugin = require("../../build/babel/client");

const babel = (code, esm = true) =>
  transform(code, {
    filename: "noop.js",
    presets: [["@babel/preset-react", { development: false, pragma: "__jsx" }]],
    plugins: [[plugin, { endpoint: "/api/actions" }]],
    babelrc: false,
    configFile: false,
    sourceType: "module",
    compact: true,
    caller: {
      name: "tests",
      supportsStaticESM: esm,
    },
  }).code;

describe("babel plugin (client)", () => {
  it("should do nothing if createAction is not imported from 'isomorphic-actions'", () => {
    const output = babel(trim`
      const myAction = createAction(() => 'hello world')

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"const myAction=createAction(()=>'hello world');export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should do nothing if createAction has already been converted to an object", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      const myAction = createAction({
        config: 'goes here'
      })

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({config:'goes here'});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should replace assigned createAction functions with configuration objects", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myAction = createAction(() => 'hello world')

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should replace anonymous createAction functions with configuration objects", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      createAction(() => 'hello world')()

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"[Anonymous Function]\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":0}}})();export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should replace in-object createAction functions with configuration objects", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myObject = {
        myAction: createAction(() => 'hello world')
      }

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myObject={myAction:createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"[Anonymous Function]\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":10}}})};export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should remove any imports only used by the action", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      import serverDependency from '.'

      const myAction = createAction(() => {
        serverDependency()
      })

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"aee01316a\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":17}}});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should remove any function only used by the action", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      
      const myAction = createAction(() => {
        serverDependency1()
        serverDependency2()
        serverDependency3()
      })

      function serverDependency1() {}
      const serverDependency2 = () => {}
      const serverDependency3 = function() {}

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ab11befba\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should remove any variables only used by the action", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      
      const myAction = createAction(() => {
        return serverDependency
      })

      const serverDependency = 'hello world'

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ab26f34c1\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });

  it("should remove any imports used by function only used by the action (nested dependencies)", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      import serverDependencyDependency from '.'
      
      const myAction = createAction(() => {
        serverDependency()
      })

      function serverDependency() {
        serverDependencyDependency()
      }

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"aee01316a\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":17}}});export default function Test(){return __jsx(\\"div\\",null);}"`
    );
  });
});
