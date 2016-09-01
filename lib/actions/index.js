import * as api from '../api'
import uuid from 'node-uuid'

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

export const close = ({url, user, password}) => {
  api.close({url, user, password})
  return {type: 'JET_CLOSE', url, user, password}
}

export const unfetch = ({url, user, password}, id) => {
  api.unfetch({url, user, password}, id)
  return {type: 'JET_UNFETCH', url, user, password, id}
}

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

