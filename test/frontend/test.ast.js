const { equal, ok } = require('assert');
const backend       = require('../../lib/backend.js');
const kernel        = require('../../lib/kernel.js');
const frontend      = require('../../lib/frontend.node.js');

describe('hack', () => it('dummy test so mocha runs the others', () => ok(true)));

(async () => {
  const { exec } = await frontend(await kernel(backend()));

  describe('ast', () => {
    describe('eval', () => {
      it('should eval at runtime', async () => {
        equal(3, await exec('(js.ast.eval (js.ast.binary "+" (js.ast.literal 1) (js.ast.literal 2)))'));
      });
    });
  });
})();
