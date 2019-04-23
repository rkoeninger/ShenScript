module.exports = {
  language:      'JavaScript',
  port:          '0.2.0',
  porters:       'Robert Koeninger',
  kernelVersion: '21.1',
  kernelPath:    'kernel',
  testsPath:     'kernel/tests',
  klPath:        'kernel/klambda',
  klExt:         '.kl',
  klFiles: [
    'toplevel', 'core',   'sys',          'dict',  'sequent',
    'yacc',     'reader', 'prolog',       'track', 'load',
    'writer',   'macros', 'declarations', 'types', 't-star'
  ],
  distPath: 'dist/'
};
