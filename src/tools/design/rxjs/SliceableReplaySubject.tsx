import { ReplaySubject } from "rxjs";
import { first } from "rxjs/operators";

export class SliceableReplaySubject<
  T extends { [key: string | number]: {} }
> extends ReplaySubject<T> {
  slices: { [key: string | number]: any } = {};
  constructor() {
    super();
    this.subscribe({
      next: (v) => {
        this.sendSliceToSubscribers(v);
      },
    });
  }
  subscribeSlice(slice: (string | number)[], next: (value: T) => void) {
    let curr = this.slices;
    for (let i = 0; i < slice.length; i++) {
      if (!curr[slice[i]]) {
        curr[slice[i]] = {};
      }
      curr = curr[slice[i]];
      if (i === slice.length - 1) {
        if (curr.__rxjssubscribers) {
          curr.__rxjssubscribers.push(next);
        } else {
          curr.__rxjssubscribers = [next];
        }
      }
    }
    // call next with current value
    const obervable = this.asObservable().pipe(first());
    obervable.subscribe({
      next: (v) => {
        let curr = v;
        for (let i = 0; i < slice.length; i++) {
          curr = curr[slice[i]] as any;
          if (!curr) {
            break;
          }
          if (i === slice.length - 1) {
            next(curr as any);
          }
        }
      },
    });

    return () => {
      this.unsubscribeSlice(slice, next);
    };
  }
  unsubscribeSlice(slice: (string | number)[], next: (value: T) => void) {
    let curr = this.slices;
    for (let i = 0; i < slice.length; i++) {
      if (curr[slice[i]]) {
        curr = curr[slice[i]];
      } else {
        console.log("Potential error: it can lead to memory leak");
      }
      if (i === slice.length - 1) {
        if (Array.isArray(curr.__rxjssubscribers)) {
          const index = (curr.__rxjssubscribers as any[]).indexOf(next);
          (curr.__rxjssubscribers as any[]).splice(index, 1);
        }
        break;
      }
    }
  }
  traverseObject(pathObj: any, baseObj: any) {
    if (typeof pathObj != "object") {
      if (
        baseObj.__rxjssubscribers &&
        Array.isArray(baseObj.__rxjssubscribers)
      ) {
        for (let i = 0; i < baseObj.__rxjssubscribers.length; i++) {
          baseObj.__rxjssubscribers[i](pathObj);
        }
      }
      return;
    }
    const keys = Object.keys(pathObj);
    for (let i = 0; i < keys.length; i++) {
      if (baseObj[keys[i]]) {
        this.traverseObject(pathObj[keys[i]], baseObj[keys[i]]);
      }
    }
  }
  sendSliceToSubscribers(v: any) {
    this.traverseObject(v, this.slices);
  }
}
