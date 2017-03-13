import * as api from '../api'
import uuid from 'uuid'

/**
 * A connection is identified by the url, user and password.
 * @typedef {object} Connection
 * @property {string} url - The Jet Daemon websocket url, like "ws://foo.bar:1234"
 * @property {string} [user] - The user (name) to login for
 * @property {string} [password] - The passowrd belonging to the specified user
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

/**
 * Action.
 * @typedef JET_CONNECT_REQUEST
 * @property {string} url
 * @property {string} [user]
 * @property {string} [password]
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

/**
 * Action.
 * @typedef JET_CONNECT_SUCCESS
 * @property {string} url
 * @property {string} [user]
 * @property {string} [password]
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

/**
 * Action.
 * @typedef JET_DEBUG
 * @property {string} url
 * @property {string} [user]
 * @property {string} [password]
 * @property {string} string - The payload as string
 * @property {*} json - The payload data as JSON
 * @property {Date} timestamp
 * @property {string} direction - "in" or "out"
 */

/**
 * Action.
 * @typedef JET_CONNECT_FAILURE
 * @property {string} url
 * @property {Error} error
 * @property {string} [user]
 * @property {string} [password]
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

const onClose = (dispatch, connection) => () => dispatch({type: 'JET_CLOSED', ...connection})

/**
 * Explicitly connect to a Jet Daemon.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_CONNECT_REQUEST} and either {@link JET_CONNET_SUCCESS}
 * or {@link JET_CONNECT_FAILURE} actions.
 *
 * In most cases it is not required to call this method, since connections
 * are created automatically on behalf of calling either of the other actions
 * {@link fetch}, {@link set} or {@link call}.
 * @function connect
 * @param {Connection} connection - The connection specification
 * @param {boolean} [debug = false] - If true, {@link JET_DEBUG} actions will be issued.
 */

export const connect = (connection, debug) => (dispatch) => {
  const {url, user, password, headers} = connection
  dispatch({type: 'JET_CONNECT_REQUEST', url, user, password, headers})
  let onReceive
  let onSend
  if (debug) {
    onReceive = (string, json) => {
      dispatch({type: 'JET_DEBUG', url, user, password, headers, string, json, timestamp: new Date(), direction: 'in'})
    }
    onSend = (string, json) => {
      dispatch({type: 'JET_DEBUG', url, user, password, headers, string, json, timestamp: new Date(), direction: 'out'})
    }
  }

  return api.connect({url, user, password, headers, onReceive, onSend}, onClose(dispatch, connection)).then(
    (response) => {
      dispatch({type: 'JET_CONNECT_SUCCESS', url, user, password, headers})
    },
    (error) => {
      dispatch({type: 'JET_CONNECT_FAILURE', url, user, password, headers, error})
      throw error
    })
}

/**
 * Action.
 * @typedef JET_CLOSE
 * @property {string} url
 * @property {string} [user]
 * @property {string} [password]
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

/**
 * Close a connection to a Jet Daemon.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_CLOSE} action.
 *
 * @function close
 * @return {Promise} Resolves when the connection has been closed
 * @param {Connection} connection - The connection specification
 * @param {Boolean} [force=false] - Force an immediate connection drop. Use
 *   This if you have evidence that server specified with 'connection' died / is unreachable.
 *
 */
export const close = ({url, user, password, headers}, force = false) => dispatch => {
  const isClosed = api.close({url, user, password, headers}, force)
  dispatch({type: 'JET_CLOSE', url, user, password, headers, force})
  return isClosed
}

/**
 * Action.
 * @typedef JET_UNFETCH
 * @property {string} url
 * @property {string} id
 * @property {string} [user]
 * @property {string} [password]
 * @property {object} [headers] - Custom headers (for alternative authentication)
 */

/**
 * Unfetches / stops the event stream specified by id.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_UNFETCH} action.
 *
 * @function unfetch
 * @param {Connection} connection - The connection specification
 * @param {string} id - The user defined id. Must be the same as used in {@link fetch}.
 */
export const unfetch = ({url, user, password, headers}, id) => {
  api.unfetch({url, user, password, headers}, id)
  return {type: 'JET_UNFETCH', url, user, password, headers, id}
}

/**
 * Action.
 * @typedef JET_FETCHER_REQUEST
 * @property {object} expression
 * @property {string} id
 */

/**
 * Action.
 * @typedef JET_FETCHER_SUCCESS
 * @property {object} expression
 * @property {string} id
 */

/**
 * Action.
 * @typedef JET_FETCHER_FAILURE
 * @property {Error} error
 * @property {object} expression
 * @property {string} id
 */

/**
 * Action.
 * @typedef JET_FETCHER_DATA
 * @property {(Object|Array)} data
 * @property {object} expression
 * @property {string} id
 */

/**
 * Fetches the event stream specified by the expression.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_FETCHER_REQUEST} and either {@link JET_FETCHER_SUCCESS}
 * or {@link JET_FETCHER_FAILURE} actions. In addition on every fetch 'data' event
 * issues a {@link JET_FETCHER_DATA} action.
 *
 * @function fetch
 * @param {Connection} connection - The connection specification
 * @param {object} expression - The fetch expression. See node-jet API doc for possible values.
 * @param {string} id - A user defined id. Should be used together with {@link sorted} and {@link unsorted} reducers.
 *
 * @see {@link https://github.com/lipp/node-jet/blob/master/doc/peer.markdown#fetcherexpressionexpr---fetcher Fetch Docu}
 */
export const fetch = (connection, expression, id) => (dispatch) => {
  dispatch({type: 'JET_FETCHER_REQUEST', expression, id})
  let dispatchedSuccess
  /*
   * The api.fetch.then() promise does not always resolves before first fetch data:
   * due to this issue: https://github.com/lipp/node-jet/issues/297.
   * Therefor this ugly dispatchedSuccess state is neccessary to keep actions in order
   */

  const onData = (...data) => {
    if (!dispatchedSuccess) {
      dispatchedSuccess = true
      dispatch({type: 'JET_FETCHER_SUCCESS', expression, id})
    }
    dispatch({type: 'JET_FETCHER_DATA', data: data, id, expression})
  }

  return api.fetch(connection, expression, id, onData, onClose(dispatch, connection)).then(
    (response) => {
      if (!dispatchedSuccess) {
        dispatchedSuccess = true
        dispatch({type: 'JET_FETCHER_SUCCESS', expression, id})
      }
    },
    (error) => {
      dispatch({type: 'JET_FETCHER_FAILURE', expression, id, error})
    })
}

/**
 * Action.
 * @typedef JET_SET_REQUEST
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {*} value
 */

/**
 * Action.
 * @typedef JET_SET_SUCCESS
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {*} value
 */

/**
 * Action.
 * @typedef JET_SET_FAILURE
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {Error} error
 */

/**
 * Tries to set a state to a new value.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_SET_REQUEST} and either {@link JET_SET_SUCCESS}
 * or {@link JET_SET_FAILURE} actions.
 *
 * @function set
 * @param {Connection} connection - The connection specification
 * @param {string} path - The state's jet path
 * @param {*} value - The supposed new value
 *
 */
export const set = (connection, path, value) => (dispatch) => {
  const id = uuid.v1()
  dispatch({type: 'JET_SET_REQUEST', path, value, id})

  return api.set(connection, path, value, onClose(dispatch, connection)).then(
    () => {
      dispatch({type: 'JET_SET_SUCCESS', path, value, id})
    },
    (error) => {
      dispatch({type: 'JET_SET_FAILURE', path, error, id})
    })
}

/**
 * Action.
 * @typedef JET_CALL_REQUEST
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {Array<*>} args
 */

/**
 * Action.
 * @typedef JET_CALL_SUCCESS
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {*} result
 * @property {Array<*>} args
 */

/**
 * Action.
 * @typedef JET_CALL_FAILURE
 * @property {string} path
 * @property {string} id - Autogenerated
 * @property {Array<*>} args
 * @property {Error} error
 */

/**
 * Calls a method with the provided arguments.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_CALL_REQUEST} and either {@link JET_CALL_SUCCESS}
 * or {@link JET_CALL_FAILURE} actions.
 *
 * @function call
 * @param {Connection} connection - The connection specification
 * @param {string} path - The methods's jet path
 * @param {Array<*>} [args=[]] - The arguments array
 *
 */
export const call = (connection, path, args) => (dispatch) => {
  const id = uuid.v1()
  dispatch({type: 'JET_CALL_REQUEST', path, args, id})

  return api.call(connection, path, args, onClose(dispatch, connection)).then(
    (result) => {
      dispatch({type: 'JET_CALL_SUCCESS', path, args, result, id})
    },
    (error) => {
      dispatch({type: 'JET_CALL_FAILURE', path, args, error, id})
    })
}

/**
 * Action.
 * @typedef JET_GET_REQUEST
 * @property {Object} expression - Fetch expression defining the match rules
 * @param {string} id - A user defined id. Should be used together with {@link sorted} and {@link unsorted} reducers.
 * @property {string} id - Autogenerated
 */

/**
 * Action.
 * @typedef JET_GET_SUCCESS
 * @property {Object} expression - Fetch expression defining the match rules
 * @param {string} id - A user defined id. Should be used together with {@link sorted} and {@link unsorted} reducers.
 * @property {string} id - Autogenerated
 * @property {Array} result
 */

/**
 * Action.
 * @typedef JET_GET_FAILURE
 * @property {Object} expression - Fetch expression defining the match rules
 * @param {string} id - A user defined id. Should be used together with {@link sorted} and {@link unsorted} reducers.
 * @property {string} id - Autogenerated
 * @property {Error} error
 */

/**
 * Tries to get a snapshot of values matching the expression.
 * A Promise/thunk based action creator.
 *
 * Triggers {@link JET_GET_REQUEST} and either {@link JET_GET_SUCCESS}
 * or {@link JET_GET_FAILURE} actions.
 *
 * @function get
 * @param {Connection} connection - The connection specification
 * @param {Object} expression - Fetch expression defining the match rules
 * @param {string} id - A user defined id. Should be used together with {@link sorted} and {@link unsorted} reducers.
 *
 */
export const get = (connection, expression, id) => (dispatch) => {
  dispatch({type: 'JET_GET_REQUEST', expression, id})

  return api.get(connection, expression, onClose(dispatch, connection)).then(
    (result) => {
      dispatch({type: 'JET_GET_SUCCESS', expression, id, result})
    },
    (error) => {
      dispatch({type: 'JET_GET_FAILURE', expression, error, id})
    })
}

export const add = (connection, path, ...args) => (dispatch) => {
  const kind = typeof args[0] !== 'function' ? 'state' : 'method'
  dispatch({type: 'JET_ADD_REQUEST', path, kind})

  return api.add(connection, path, args, onClose(dispatch, connection)).then(
    () => {
      dispatch({type: 'JET_ADD_SUCCESS', path, kind})
    },
    (error) => {
      dispatch({type: 'JET_ADD_FAILURE', path, error})
    }
  )
}

/**
 * A State's "set" callback handler. Called whenever a Peer tries to set the state to a new value.
 *
 * @callback stateCallback
 * @this State
 * @param {*} newValue - The new requested value
 * @param {function} [reply] - For async set handlers
 *
 * @see {@link https://github.com/lipp/node-jet/blob/master/doc/peer.markdown#stateonset-cb|node-jet documentation}
 */

/**
 * Adds a (local) state to the Jet daemon.
 *
 * @function addState
 * @param {Connection} connection - The connection specification
 * @param {String} path - The unique path of the state
 * @param {*} initialValue - The state's initial value
 * @param {stateCallback} [onSet] - The set callback handler (don't use fat arrow for accessing "this")
 */
export const addState = (connection, path, initialValue, onSet) => {
  return add(connection, path, initialValue, onSet)
}

/**
 * A Method's "call" callback handler. Called whenever a Peer tries to call the method.
 *
 * @callback methodCallback
 * @param {Array<*>} args - The arguments
 * @param {function} [reply] - For async call handlers
 *
 * @see {@link https://github.com/lipp/node-jet/blob/master/doc/peer.markdown#methodoncall-cb|node-jet documentation}
 */

/**
 * Adds a method to the Jet daemon.
 *
 * @function addMethod
 * @param {Connection} connection - The connection specification
 * @param {String} path - The unique path of the method
 * @param {methodCallback} onCall - The on call callback handler
 */
export const addMethod = (connection, path, onCall) => {
  return add(connection, path, onCall)
}

/**
 * Removes a state or method.
 *
 * @function remove
 * @param {Connection} connection - The connection specification
 * @param {String} path - The unique path of the state or method to remove
 */
export const remove = (connection, path) => (dispatch) => {
  dispatch({type: 'JET_REMOVE_REQUEST', path})

  return api.remove(connection, path).then(
    () => {
      dispatch({type: 'JET_REMOVE_SUCCESS', path})
    },
    (error) => {
      dispatch({type: 'JET_REMOVE_FAILURE', path, error})
    }
  )
}

/**
 * Posts a state change. The state must have been previously added with {@link addState}.
 * To change/set a non-locally added State, call {@link set}.
 *
 * @function change
 * @param {Connection} connection - The connection specification
 * @param {String} path - The unique path of the state
 * @param {*} newValue - The state's new Value
 */
export const change = (connection, path, value) => (dispatch) => {
  dispatch({type: 'JET_CHANGE_REQUEST', path, value})

  return api.change(connection, path, value).then(
    () => {
      dispatch({type: 'JET_CHANGE_SUCCESS', path})
    },
    (error) => {
      dispatch({type: 'JET_CHANGE_FAILURE', path, error})
    }
  )
}
