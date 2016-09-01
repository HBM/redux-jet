import * as api from '../api'
import uuid from 'node-uuid'

/**
 * A connection is identified by the url, user and password.
 * @typedef {object} Connection
 * @property {string} url - The Jet Daemon websocket url, like "ws://foo.bar:1234"
 * @property {string} [user] - The user (name) to login for
 * @property {string} [password] - The passowrd belonging to the specified user
 */

/**
 * @typedef JET_CONNECT_REQUEST
 * @property {string} url
 * @property {string} [user]
 * @property {string} [password]
 */

/**
 * Explicitly connect to a Jet Daemon.
 *
 * Triggers {@link JET_CONNECT_REQUEST} and either {@link JET_CONNET_SUCCESS}
 * or {@link JET_CONNECT_FAILURE} actions.
 *
 * In most cases it is not required to call this method, since connections
 * are created automatically on behalf of calling either of the other actions
 * {@link fetch}, {@link set} or {@link call}.
 * @function connect
 * @param {Connection} connection - The connection specification
 */
export const connect = ({url, user, password}) => (dispatch) => {
  dispatch({type: 'JET_CONNECT_REQUEST', url, user, password})

  return api.connect({url, user, password}).then(
    (response) => {
      dispatch({type: 'JET_CONNECT_SUCCESS', url, user, password})
    },
    (error) => {
      dispatch({type: 'JET_CONNECT_FAILURE', url, user, error})
    })
}

/**
 * Close a connection to a Jet Daemon.
 *
 * Triggers {@link JET_CLOSE} action.
 *
 * @function close
 * @param {Connection} connection - The connection specification
 *
 */
export const close = ({url, user, password}) => {
  api.close({url, user, password})
  return {type: 'JET_CLOSE', url, user, password}
}

/**
 * Unfetches / stops the event stream specified by id.
 *
 * Triggers {@link JET_UNFETCH} action.
 *
 * @function unfetch
 * @param {Connection} connection - The connection specification
 * @param {string} id - The user defined id. Must be the same as used in {@link fetch}.
 */
export const unfetch = ({url, user, password}, id) => {
  api.unfetch({url, user, password}, id)
  return {type: 'JET_UNFETCH', url, user, password, id}
}

/**
 * Fetches the event stream specified by the expression.
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

  const onData = (data) => {
    dispatch({type: 'JET_FETCHER_DATA', data: data, id, expression})
  }

  return api.fetch(connection, expression, id, onData).then(
    (response) => {
      dispatch({type: 'JET_FETCHER_SUCCESS', expression, id})
    },
    (error) => {
      dispatch({type: 'JET_FETCHER_FAILURE', expression, id, error})
    })
}

/**
 * Tries to set a state to a new value.
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

  return api.set(connection, path, value).then(
    () => {
      dispatch({type: 'JET_SET_SUCCESS', path, value, id})
    },
    (error) => {
      dispatch({type: 'JET_SET_FAILURE', path, error, id})
    })
}

/**
 * Calls a method with the provided arguments.
 *
 * Triggers {@link JET_CALL_REQUEST} and either {@link JET_CALL_SUCCESS}
 * or {@link JET_CALL_FAILURE} actions.
 *
 * @function call
 * @param {Connection} connection - The connection specification
 * @param {string} path - The methods's jet path
 * @param {Array[*]} args - Array with the arguments
 *
 */
export const call = (connection, path, args) => (dispatch) => {
  const id = uuid.v1()
  dispatch({type: 'JET_CALL_REQUEST', path, args, id})

  return api.call(connection, path, args).then(
    (result) => {
      dispatch({type: 'JET_CALL_SUCCESS', path, args, result, id})
    },
    (error) => {
      dispatch({type: 'JET_CALL_FAILURE', path, args, error, id})
    })
}

