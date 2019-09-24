module.exports = {
  kernelVersion: '21.2',
  kernelPath:    'kernel',
  testsPath:     'kernel/tests',
  klPath:        'kernel/klambda',
  klExt:         '.kl',
  klFiles: [
    'toplevel', 'core',   'sys',          'dict',  'sequent',
    'yacc',     'reader', 'prolog',       'track', 'load',
    'writer',   'macros', 'declarations', 'types', 't-star', 'init'
  ]
};
