import { Peer, Fetcher, State, Method } from 'node-jet'

let peers = {}
let pendings = {}
let fetchers = {}
let elements = {}
let onCloseCbs = {}

const ensurePeer = ({url, user, password, headers, onSend, onReceive}, onClose) => {
  return new Promise((resolve, reject) => {
    const id = [url, user, password, JSON.stringify(headers)].join('--')
    if (!peers[id]) {
      pendings[id] = []
      const peer = new Peer({url, user, password, headers, onSend, onReceive})
      peers[id] = peer
      onCloseCbs[id] = () => {
        delete onCloseCbs[id]
        onClose()
      }

      peer.connect()
        .then(() => {
          pendings[id].forEach((pending) => {
            pending.resolve(peer)
          })
          delete pendings[id]
        })
        .catch((err) => {
          if (!pendings[id]) {
            return
          }
          pendings[id].forEach((pending) => {
            pending.reject(err)
          })
          delete pendings[id]
        })

      peer.closed().then(() => {
        if (!pendings[id] && peers[id]) {
          if (onCloseCbs[id]) {
            onCloseCbs[id]()
          }
        }
        delete peers[id]
      })
    }

    if (pendings[id]) {
      pendings[id].push({resolve, reject})
    } else {
      resolve(peers[id])
    }
  })
}

export const connect = (connection, onClose) => {
  return ensurePeer(connection, onClose)
}

export const close = (connection, force) => {
  const {url, user, password, headers} = connection
  const id = [url, user, password, JSON.stringify(headers)].join('--')
  if (peers[id]) {
    peers[id].close()
    if (force) {
      if (pendings[id]) {
        pendings[id].forEach(pending => {
          pending.reject('forced close')
        })
        delete pendings[id]
      }
      delete onCloseCbs[id]
      delete peers[id]
    }
  }
}

const noop = () => {}

export const unfetch = (connection, id) => {
  const {url, user, password, headers} = connection
  const fid = [url, user, password, JSON.stringify(headers), id].join('--')
  let fetcher = fetchers[fid]
  if (fetcher) {
    fetcher.unfetch().catch(noop)
  }
  delete fetchers[fid]
}

export const fetch = (connection, expression, id, onStatesDidChange, onClose) => {
  return ensurePeer(connection, onClose)
    .then((peer) => {
      const {url, user, password, headers} = connection
      const fid = [url, user, password, JSON.stringify(headers), id].join('--')
      let fetcher = fetchers[fid]
      if (fetcher) {
        fetcher.unfetch().catch(noop)
      }
      fetcher = new Fetcher()
        .expression(expression)
        .on('data', onStatesDidChange)
      fetchers[fid] = fetcher
      return peer.fetch(fetcher)
    })
}

export const set = (connection, path, value, onClose) => {
  return ensurePeer(connection, onClose)
    .then((peer) => {
      return peer.set(path, value)
    })
}

export const call = (connection, path, args, onClose) => {
  return ensurePeer(connection, onClose)
    .then((peer) => {
      return peer.call(path, args)
    })
}

export const get = (connection, expression, onClose) => {
  return ensurePeer(connection, onClose)
    .then((peer) => {
      return peer.get(expression)
    })
}

export const add = (connection, path, args, onClose) => {
  return ensurePeer(connection, onClose)
    .then((peer) => {
      let element
      if (typeof args[0] === 'function') {
        element = new Method(path)
        element.on('call', args[0])
      } else {
        element = new State(path, args[0])
        if (args[1]) {
          element.on('set', args[1])
        }
      }
      return peer.add(element).then(() => {
        const id = [connection.url, connection.user, connection.password, JSON.stringify(connection.headers), path].join('--')
        elements[id] = element
      })
    })
}

const invalidPath = path => new Error('no such state or method:' + path)

export const remove = (connection, path) => {
  const id = [connection.url, connection.user, connection.password, JSON.stringify(connection.headers), path].join('--')
  if (!elements[id]) {
    return Promise.reject(invalidPath())
  }
  return elements[id].remove().then(() => {
    delete elements[id]
  })
}

export const change = (connection, path, value) => {
  const id = [connection.url, connection.user, connection.password, JSON.stringify(connection.headers), path].join('--')
  if (!elements[id]) {
    return Promise.reject(invalidPath())
  }
  elements[id].value(value)
  return Promise.resolve()
}
