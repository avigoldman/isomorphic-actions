const { transform } = require("@babel/core");

const trim = (s) => s.join("\n").trim().replace(/^\s+/gm, "");

const plugin = require("../../build/babel/server");

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

describe("babel plugin (server)", () => {
  it("should remove the default export", () => {
    const output = babel(trim`
      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';export default $$actionRouter({});"`
    );
  });

  it("should remove named exports", () => {
    const output = babel(trim`
      export function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';export default $$actionRouter({});"`
    );
  });

  it("should export assigned createAction functions", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myAction = createAction(() => 'hello world')

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should export anonymous createAction functions", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      createAction(() => 'hello world')()

      export default function Test() {
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"[Anonymous Function]\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":0}}})();const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should in-object anonymous createAction functions", () => {
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
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myObject={myAction:createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"[Anonymous Function]\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":10}}})};const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should remove any imports only used by the client", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      import clientDependency from '.'

      const myAction = createAction(() => 'hello wolrd')

      export default function Test() {
        clientDependency()
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ac8cc16bc\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":17}}});const ac8cc16bc=$$action(()=>'hello wolrd');export default $$actionRouter({ac8cc16bc:ac8cc16bc});"`
    );
  });

  it("should remove any function only used by the client", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myAction = createAction(() => 'hello world')

      function clientDependency1() {}
      const clientDependency2 = () => {}
      const clientDependency3 = function() {}

      export default function Test() {
        clientDependency1()
        clientDependency2()
        clientDependency3()
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should remove any variables only used by the client", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myAction = createAction(() => 'hello world')

      const clientDependency = 'hello world'

      export default function Test() {
        clientDependency
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":2,\\"column\\":17}}});const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should remove any imports used by function only used by the client (nested dependencies)", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'
      import clientDependencyDependency from '.'

      const myAction = createAction(() => 'hello world')

      function clientDependency() {
        clientDependencyDependency()
      }

      export default function Test() {
        clientDependency()
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';import{createAction}from'isomorphic-actions';const myAction=createAction({\\"actionId\\":\\"ad8f8847c\\",\\"fileId\\":\\"ad4d299\\",\\"endpoint\\":\\"/api/actions\\",\\"debug\\":{\\"functionName\\":\\"myAction\\",\\"filename\\":\\"/Users/avigoldman/src/projects/isomorphic-actions/isomorphic-actions/noop.js\\",\\"loc\\":{\\"line\\":3,\\"column\\":17}}});const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });

  it("should remove the createAction call when the action is run in the client side", () => {
    const output = babel(trim`
      import { createAction } from 'isomorphic-actions'

      const myAction = createAction(() => 'hello world')

      export default function Test() {
        myAction()
        return <div />
      }
    `);
    expect(output).toMatchInlineSnapshot(
      `"import $$actionRouter from'isomorphic-actions/runtime/server/actionRouter';import $$action from'isomorphic-actions/runtime/server/action';const ad8f8847c=$$action(()=>'hello world');export default $$actionRouter({ad8f8847c:ad8f8847c});"`
    );
  });
});
