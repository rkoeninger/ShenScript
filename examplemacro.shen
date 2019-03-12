\\ (defmacro plus-macro [X + Y] -> [+ X Y])

(shen.eval-without-macros (shen.elim-def (read-from-string "(defmacro plus-macro [X + Y] -> [+ X Y])")))
