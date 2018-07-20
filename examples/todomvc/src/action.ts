import { id } from '@most/prelude'
import { App, Id, Filter, addTodo, updateCompleted, removeTodo, updateAllCompleted, removeAllCompleted, setFilter } from './model'

type DOMEvent<E> = { target: E } & Event
type InputEvent = { keyCode: number } & DOMEvent<HTMLInputElement>
type ClickEvent = DOMEvent<HTMLElement>
type HashChangeEvent = { newURL: string } & Event

const ENTER_KEY = 13
// const ESC_KEY = 27

export type Action = (app: App) => App

export const runAction = (app: App, action: Action): App =>
  action(app)

const findId = (el: HTMLElement): Id => {
  const todoEl = el.closest('[data-id]')
  return todoEl instanceof HTMLElement ? Number(todoEl.dataset.id) : -1
}

export const handleAdd = (e: InputEvent): Action => {
  const value = e.target.value.trim()
  if (e.keyCode !== ENTER_KEY || value.length === 0) {
    return id
  }
  e.target.value = ''
  return addTodo(value)
}

export const handleToggleAll = (e: InputEvent): Action =>
  updateAllCompleted(e.target.checked)

export const handleComplete = (e: InputEvent): Action =>
  updateCompleted(e.target.checked, findId(e.target))

export const handleRemove = (e: ClickEvent): Action =>
  removeTodo(findId(e.target))

export const handleRemoveAllCompleted = (e: InputEvent): Action =>
  removeAllCompleted

export const handleFilterChange = (e: HashChangeEvent): Action =>
  setFilter(e.newURL.replace(/^.*#/, '') as Filter)
