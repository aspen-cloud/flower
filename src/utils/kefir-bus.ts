import * as kefir from "kefir";

export default class KefirBus<T, S> {
  private pool: kefir.Pool<T, S>;

  private emitter?: kefir.Emitter<T, S>;

  stream: kefir.Stream<T, S>;

  constructor(name: string) {
    this.pool = kefir.pool<T, S>();

    this.stream = kefir.stream((_emitter) => {
      this.emitter = _emitter;
      this.pool.onAny(_emitter.emitEvent);
      return () => {
        this.emitter = undefined;
        this.pool.offAny(_emitter.emitEvent);
      };
    });

    this.stream.setName(name);
  }

  emit(x: T): KefirBus<T, S> {
    this.emitter?.emit(x);
    return this;
  }

  error(x: S): KefirBus<T, S> {
    this.emitter?.error(x);
    return this;
  }

  end(): KefirBus<T, S> {
    this.emitter?.end();
    return this;
  }

  emitEvent(x: kefir.Event<T, S>): KefirBus<T, S> {
    this.emitter?.emitEvent(x);
    return this;
  }

  plug(x: kefir.Stream<T, S>): KefirBus<T, S> {
    this.pool.plug(x);
    return this;
  }

  unplug(x: kefir.Stream<T, S>): KefirBus<T, S> {
    this.pool.unplug(x);
    return this;
  }
}
