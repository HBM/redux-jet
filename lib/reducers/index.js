export const sorted = (id) => (state = [], action) => {
  if (action.id !== id) {
    return state
  }
  switch (action.type) {
    case 'JET_FETCHER_FAILURE':
    case 'JET_FETCHER_REQUEST':
      return []
    case 'JET_FETCHER_CONTENT_CHANGE':
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
    case 'JET_FETCHER_CONTENT_CHANGE':
      let newState = {...state}
      if (action.event === 'remove') {
        delete newState[action.path]
      } else {
        newState[action.path] = action.value
      }
      return newState
    default:
      return state
  }
}

const setRequest = (state, action) => {
  switch (action.type) {
    case 'JET_SET_REQUEST':
      const {path, value, id} = action
      return {path, value, id, pending: true}
    case 'JET_SET_SUCCESS':
      if (state.id !== action.id) {
        return state
      }
      return {
        ...state,
        pending: false
      }
    case 'JET_SET_FAILURE':
      if (state.id !== action.id) {
        return state
      }
      return {
        ...state,
        message: action.message,
        pending: false
      }
    default:
      return state
  }
}

const callRequest = (state, action) => {
  switch (action.type) {
    case 'JET_CALL_REQUEST':
      const {path, args, id} = action
      return {path, args, id, pending: true}
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
      if (state.id !== action.id) {
        return state
      }
      return {
        ...state,
        message: action.message,
        pending: false
      }
    default:
      return state
  }
}

export const requests = (maxLength) => (state = [], action) => {
  const start = state.length - maxLength
  switch (action.type) {
    case 'JET_SET_REQUEST':
      return [
        ...state,
        setRequest(undefined, action)
      ].splice(start)
    case 'JET_SET_SUCCESS':
    case 'JET_SET_FAILURE':
      return state.map((t) => {
        return setRequest(t, action)
      }).splice(start)
    case 'JET_CALL_REQUEST':
      return [
        ...state,
        callRequest(undefined, action)
      ].splice(start)
    case 'JET_CALL_SUCCESS':
    case 'JET_CALL_FAILURE':
      return state.map((t) => {
        return callRequest(t, action)
      }).splice(start)
  }
}

