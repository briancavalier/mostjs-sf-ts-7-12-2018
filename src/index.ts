import { combine, map, runEffects, startWith } from '@most/core'
import { input } from '@most/dom-event'
import { newDefaultScheduler } from '@most/scheduler'

// Display the result of adding two inputs.
// The result is reactive and updates whenever *either* input changes.

const fail = (msg: string) => { throw new Error(msg) }
const qs = (selector: string) =>
  document.querySelector(selector) || fail(selector)

const xInput = qs('input.x')
const yInput = qs('input.y')
const resultNode = qs('.result')

const add = (x: number, y: number): number => x + y

const toNumber = (e: Event): number =>
  Number((e.target as HTMLFormElement).value)

const renderResult = (result: number) => {
  resultNode.textContent = String(result)
}

// x represents the current value of xInput
const x = startWith(0, map(toNumber, input(xInput)))

// y represents the current value of yInput
const y = startWith(0, map(toNumber, input(yInput)))

// result is the live current value of adding x and y
const result = combine(add, x, y)

// Observe the result value by rendering it to the resultNode
const updates = map(renderResult, result)

runEffects(updates, newDefaultScheduler())