const handleRequestResponse = (action, getElement) => {
  let element
  switch (action.type) {
    case 'JET_SET_REQUEST':
    case 'JET_CALL_REQUEST':
      element = getElement()
      if (!element) {
        return
      }
      let request = {
        pending: true,
        id: action.id
      }
      if (action.type === 'JET_SET_REQUEST') {
        request.value = action.value
      } else {
        request.args = action.args
      }
      return {
        ...element,
        request
      }
    case 'JET_SET_SUCCESS':
    case 'JET_CALL_SUCCESS':
      element = getElement()
      if (!element || !element.request || element.request.id !== action.id) {
        return
      }
      return {
        ...element,
        request: {
          ...element.request,
          pending: false,
          result: action.result
        }
      }
    case 'JET_SET_FAILURE':
    case 'JET_CALL_FAILURE':
      element = getElement()
      if (!element || !element.request || element.request.id !== action.id) {
        return
      }
      return {
        ...element,
        request: {
          ...element.request,
          pending: false,
          error: action.error
        }
      }
    default:
      return
  }
}

const _sorted = (state = [], action) => {
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_GET_FAILURE':
      return []
    case 'JET_GET_SUCCESS':
      return action.result
    case 'JET_FETCHER_DATA':
      if (!action.expression.sort) {
        console.error(`The fetch expression for id=${action.id} is not defined "sort".`)
        return []
      }
      const changes = action.data[0]
      const length = action.data[1]
      let newState = state.slice(0, length)
      const from = action.expression.sort.from
      changes.forEach(change => {
        const prev = state.find(s => s.path === change.path)
        const index = change.index - from
        if (prev && prev.request) {
          const {request} = prev
          newState[index] = {...change, request}
        } else {
          newState[index] = {...change}
        }
      })
      return newState
    default:
      return state
  }
}

/**
 * Creates a reducer for sorted fetch expressions.
 *
 * @function sorted
 * @param {string} id - A user defined id.
 *
 * @example
 * import { fetch, sorted } from 'redux-jet'
 * const id = 'foos'
 * const expression = {
 *   path: {
 *     startsWith: 'foo/'
 *   },
 *   sort: {
 *     byPath: true,
 *     from: 1,
 *     to: 100
 *   }
 * }
 * fetch(connection, expression, id)
 * ...
 * combineReducer({foos: sorted(id)})
 */
export const sorted = (id, initialState = []) => (state = initialState, action) => {
  const element = handleRequestResponse(action, () => state.find(s => s.path === action.path))
  if (element) {
    const index = state.findIndex(s => s.path === action.path)
    return [
      ...state.slice(0, index),
      element,
      ...state.slice(index + 1)
    ]
  }
  if (action.id !== id) {
    return state
  }
  return _sorted(state, action)
}

/**
 * Creates a reducer delivering fetch results as array.
 * For sorting fetchers, this is the same as calling {@link sorted}.
 * For unsorted fetchers, the order is as the states/methods are coming
 * in via wire.
 *
 * Use this, if you don't know if the respective fetcher is sorted or unsorted.
 *
 * @function array
 * @param {string} id - A user defined id.
 *
 * @example
 * import { fetch, array } from 'redux-jet'
 * const id = 'foos'
 * const expression = {
 *   path: {
 *     startsWith: 'foo/'
 *   }
 * }
 * fetch(connection, expression, id)
 * ...
 * combineReducer({foos: array(id)})
 */
export const array = (id, initialState = []) => (state = initialState, action) => {
  const element = handleRequestResponse(action, () => state.find(s => s.path === action.path))
  if (element) {
    const index = state.findIndex(s => s.path === action.path)
    return [
      ...state.slice(0, index),
      element,
      ...state.slice(index + 1)
    ]
  }
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_GET_FAILURE':
      return []
    case 'JET_GET_SUCCESS':
      return action.result
    case 'JET_FETCHER_DATA':
      if (action.expression.sort) {
        return _sorted(state, action)
      } else {
        const {path, event, value} = action.data[0]
        if (event === 'add') {
          return [...state, {path, value}]
        } else if (event === 'change') {
          const index = state.findIndex(e => e.path === path)
          return [
            ...state.slice(0, index),
            {...state[index], path, value},
            ...state.slice(index + 1)
          ]
        } else {
          const index = state.findIndex(e => e.path === path)
          return [
            ...state.slice(0, index),
            ...state.slice(index + 1)
          ]
        }
      }
    default:
      return state
  }
}

/**
 * Creates a reducer for unsorted fetch expressions.
 *
 * @function unsorted
 * @param {string} id - A user defined id.
 *
 * @example
 * import { fetch, sorted } from 'redux-jet'
 * const id = 'foos'
 * const expression = {
 *   path: {
 *     startsWith: 'foo/'
 *   }
 * }
 * fetch(connection, expression, id)
 * ...
 * combineReducer({foos: unsorted(id)})
 *
 */
export const unsorted = (id, initialState = {}) => (state = initialState, action) => {
  const element = handleRequestResponse(action, () => state[action.path])
  if (element) {
    return {...state, [action.path]: element}
  }
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_GET_FAILURE':
      return []
    case 'JET_GET_SUCCESS':
      return action.result
    case 'JET_FETCHER_DATA':
      let newState = {...state}
      const {path, value, event} = action.data[0]
      if (event === 'remove') {
        delete newState[path]
      } else {
        newState[path] = {...newState[path], value}
      }
      return newState
    default:
      return state
  }
}

/**
 * Creates a reducer for a fetch expressions yielding exactly one single state match.
 *
 * If the corresponding fetch expression matches more than one state, the behaviour
 * is unpredictable. Thus, it is recommended to use an `path.equals` fetch expression.
 *
 * @function single
 * @param {string} id - A user defined id.
 *
 * @example
 * import { fetch, single } from 'redux-jet'
 * const id = 'foobar'
 * const expression = {
 *   path: {
 *     equals: 'foo/bar'
 *   }
 * }
 * fetch(connection, expression, id)
 * ...
 * combineReducer({foobar: single(id)})
 *
 */
export const single = (id, initialState = null) => (state = initialState, action) => {
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_GET_FAILURE':
      return null
    case 'JET_GET_SUCCESS':
      return action.result[0] ? action.result[0].value : null
    case 'JET_FETCHER_DATA':
      const {value, event} = action.data[0]
      if (event === 'add' || event === 'change') {
        return value
      } else {
        return null
      }
    default:
      return state
  }
}

export const messages = (maxLength = 1000) => (state = [], action) => {
  switch (action.type) {
    case 'JET_DEBUG':
      return [action, ...state.slice(0, maxLength - 1)]
    default:
      return state
  }
}

export const request = (state, action) => {
  switch (action.type) {
    case 'JET_SET_REQUEST':
    case 'JET_CALL_REQUEST':
      const {path, id} = action
      if (action.type === 'JET_SET_REQUEST') {
        return {path, value: action.value, id, pending: true}
      } else {
        return {path, args: action.args, id, pending: true}
      }
    case 'JET_SET_SUCCESS':
    case 'JET_CALL_SUCCESS':
      if (state.id !== action.id) {
        return state
      }
      return {
        ...state,
        result: action.result,
        pending: false
      }
    case 'JET_SET_FAILURE':
    case 'JET_CALL_FAILURE':
      if (state.id !== action.id) {
        return state
      }
      return {
        ...state,
        error: action.error,
        pending: false
      }
    default:
      return state
  }
}

export const requests = (maxLength = 100) => (state = [], action) => {
  const start = state.length - maxLength
  switch (action.type) {
    case 'JET_SET_REQUEST':
    case 'JET_CALL_REQUEST':
      return [
        ...state,
        request(undefined, action)
      ].splice(start + 1)
    case 'JET_SET_SUCCESS':
    case 'JET_CALL_SUCCESS':
    case 'JET_SET_FAILURE':
    case 'JET_CALL_FAILURE':
      return state.map((t) => {
        return request(t, action)
      }).splice(start)
    default:
      return state
  }
}

