env.shen.shen = async () => {
  await env.shen.credits();
  return env.shen.loop();
};

env.shen.credits = async () => {
  await env.shen.prhush("\nShen, copyright (C) 2010-2015 Mark Tarver\n", env.symbols['*stoutput*']);
  await env.shen.prhush(await env.cn("www.shenlanguage.org, ", await env.shen.app(await env.value(await env.intern("*version*")), "\n", await env.intern("shen.a"))), await env.stoutput());
  return env.shen.prhush(await env.cn("running under ", await env.shen.app(await env.value(Symbol.for("*language*")))), await env.stoutput());  
};

env.shen.loop = async () => {
  await env.shen.initialise_environment();
  await env.shen.prompt();
  try {
    await env.shen["read-evaluate-print"]();
  } catch (E) {
    await env.shen["toplevel-display-exception"](E);
  }
  return env.shen.loop();
};

env.shen["toplevel-display-exception"] = async (V3935) => env.pr(asError(V3935).message, env.symbols['*stoutput*']);

env.shen.initialise_environment = async () => env.shen.multiple_set(await env.cons(Symbol.for("shen.*call*"), await env.cons(0, await env.cons(Symbol.for("shen.*infs*"), await env.cons(0, await env.intern("shen.*process-counter*"), await env.cons(0, await env.cons(Symbol.for("shen.*catch*"), env.cons(0, null))))))));

env.shen.destroy = async (V3939) => env.declare(V3939, env.intern("symbol"));

env.shen["read-evaluate-print"] = async () => {
  const Lineread = await env.shen.toplineread();
  const History = await env.value(Symbol.for("shen.*history*"));
  const NewLineread = await env.shen.retrieve_from_history_if_needed(Lineread, History);
  const NewHistory = await env.shen.update_history(NewLineread, History);
  const Parsed = await env.fst(NewLineread);
  return env.shen.toplevel(Parsed);
};

env.shen.retrieve_from_history_if_needed = async (V3951, V3952) => {
  if (await env["tuple?"](V3951) && await env["cons?"](await env["snd"](V3951)) && await env["element?"](, await env.shen.cons(await env.shen.space(), await env.shen.cons(await env.shen.newline(), EMPTY)))) {
    return env.shen.retrieve_from_history_if_needed(await env["@p"](await env.fst(V3951), await env.tl(await env.snd(V3951))), V3952);
  } // snip else if block
  else if (await env["tuple?"](V3951) && await env["cons?"](await env.snd(V3951)) && await env["="](await env.hd(await env.snd(V3951)), await env.shen.exclamation())) {
    const `Key?` = await env.shen["make-key"](await env.tl(await env.snd(V3951)), V3952);
    const Find = await env.head(env.shen["find-past-inputs"](`Key?`, V3952));
    const PastPrint = await env.shen.prbytes(await env.snd(Find));
    return Find;
  } else if (await env["tuple?"](V3951) && await env["cons?"](await env.snd(V3951)) && await env["="](EMPTY, await env.tl(await env.snd(V3951))) && await env["="](await env.hd(await env.snd(V3951)), await env.shen.percent())) {
    await env.shen["print-past-inputs"](async (X) => true, await env.reverse(V3952, 0));
    return env.abort();
  } else if (await env["tuple?"](V3951) && await env["cons?"](await env.snd(V3951)) && await env["="](await env.hd(await env.snd(V3951)), await env.shen.percent())) {
    const `Key?` = await env.shen["make-key"](await env.tl(await env.snd(V3951)), V3952);
    const Find = await env.head(env.shen["find-past-inputs"](await env.reverse(V3952), 0));
    const PastPrint = await env.shen.prbytes(await env.snd(Find));
    return env.abort();
  } else {
    return V3951;
  }
};

env.shen.percent = async () => 37;

env.shen.exclamation = async () => 33;

env.shen.prbytes = async (V3954) => {
  env.shen["for-each"](async Byte => env.pr(await env["n->string"](Byte), await env.stoutput()), V3954);
  return env.nl(1);
};

env.shen.update_history = async (V3957, V3958) => env.set(await env.intern("shen.*history*"), await env.cons(V3957, V3958));

env.shen.toplineread = async () => env.shen.toplineread_loop(await env.shen["read-char-code"](await env.stinput()));

env.set(env.intern("shen.*history*", EMPTY));
