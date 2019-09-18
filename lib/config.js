module.exports = {
  language:      'JavaScript',
  port:          '0.4.0',
  porters:       'Robert Koeninger',
  kernelVersion: '21.2',
  kernelPath:    'kernel',
  testsPath:     'kernel/tests',
  klPath:        'kernel/klambda',
  klExt:         '.kl',
  klFiles: [
    'toplevel', 'core',   'sys',          'dict',  'sequent',
    'yacc',     'reader', 'prolog',       'track', 'load',
    'writer',   'macros', 'declarations', 'types', 't-star'
  ]
};
