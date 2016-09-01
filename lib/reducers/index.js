export const sorted = (id) => (state = [], action) => {
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_FETCHER_REQUEST':
      return []
    case 'JET_FETCHER_DATA':
      return [...action.data]
    default:
      return state
  }
}

export const unsorted = (id) => (state = {}, action) => {
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_FETCHER_REQUEST':
      return []
    case 'JET_FETCHER_DATA':
      let newState = {...state}
      const {path, value, event} = action.data
      if (event === 'remove') {
        delete newState[path]
      } else {
        newState[path] = value
      }
      return newState
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

