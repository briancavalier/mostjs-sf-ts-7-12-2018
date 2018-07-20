import { Scheduler, Stream } from '@most/types'
import { MulticastSource, never } from '@most/core'

export const createHyperEventAdapter = <A>(scheduler: Scheduler): ([(action: A) => void, Stream<A>]) => {
  const stream = new MulticastSource(never())
  return [action => stream.event(scheduler.currentTime(), action), stream]
}
