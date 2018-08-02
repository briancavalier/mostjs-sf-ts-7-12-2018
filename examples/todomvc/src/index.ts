// TODO:
// 1. localStorage
// 2. todo editing
import { chain, constant, skipRepeats, map, merge, scan, runEffects } from '@most/core'
import { Stream } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import { hashchange } from '@most/dom-event'
import { nextAnimationFrame } from '@most/animation-frame'

import { emptyApp } from './model'
import { updateView } from './view'
import { Action, handleFilterChange, runAction } from './action'
import { createHyperEventAdapter } from './hyperEventAdapter'

const fail = (s: string): never => { throw new Error(s) }
const qs = (s: string, el: Document): Element =>
  el.querySelector(s) || fail(`${s} not found`)

// TodoMVC is a relatively slow-moving app, but let's use
// animation frames to do UI updates anyway
const raf = <A> (a: A): Stream<A> =>
  constant(a, nextAnimationFrame(window))

const appNode = qs('.todoapp', document)
const appState = emptyApp
const scheduler = newDefaultScheduler()

const [addAction, todoActions] = createHyperEventAdapter<Action>(scheduler)

const updateFilter = map(handleFilterChange, hashchange(window))

const actions = merge(todoActions, updateFilter)

const stateUpdates = skipRepeats(scan(runAction, appState, actions))
const viewUpdates = scan(updateView(addAction), appNode, chain(raf, stateUpdates))

runEffects(viewUpdates, scheduler)
