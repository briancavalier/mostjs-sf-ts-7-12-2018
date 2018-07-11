import { map, runEffects, startWith, tap, until } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { mousemove, click } from '@most/dom-event'

const toCoords = (e: MouseEvent): string => `${e.clientX},${e.clientY}`
const render = (s: string): void => { document.body.textContent = s }

const moveUntilClick = until(click(document), mousemove(document))

const coords = map(toCoords, moveUntilClick)
const updates = startWith('move the mouse, please', coords)

runEffects(tap(render, updates), newDefaultScheduler())
