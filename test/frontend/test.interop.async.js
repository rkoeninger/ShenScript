const { equal, ok, rejects } = require('assert');
const forEach                = require('mocha-each');
const { parseForm }          = require('../../scripts/parser');
const backend                = require('../../src/backend');
const frontend               = require('../../src/frontend');

const { evalKl, f } = frontend(backend({ async: true }));

describe('interop', () => {
  describe('async', () => {
    
  });
});
