import { Peer, Fetcher } from 'node-jet'

let peers = {}
let pendings = {}
let fetchers = {}

const ensurePeer = ({url, user, password, onSend, onReceive}) => {
  return new Promise((resolve, reject) => {
    const id = [url, user, password].join('--')
    if (!peers[id]) {
      pendings[id] = []
      const peer = new Peer({url, user, password, onSend, onReceive})
      peers[id] = peer

      peer.connect()
        .then(() => {
          pendings[id].forEach((pending) => {
            pending.resolve(peer)
          })
          delete pendings[id]
        })
        .catch((err) => {
          pendings[id].forEach((pending) => {
            pending.reject(err)
          })
          delete pendings[id]
        })

      peer.closed().then(() => {
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

export const connect = (connection) => {
  return ensurePeer(connection)
}

export const close = (connection) => {
  const {url, user, password} = connection
  const id = [url, user, password].join('--')
  if (peers[id]) {
    peers[id].close()
  }
}

export const unfetch = (connection, id) => {
  const {url, user, password} = connection
  const fid = [url, user, password, id].join('--')
  let fetcher = fetchers[fid]
  if (fetcher) {
    fetcher.unfetch()
  }
  delete fetchers[fid]
}

export const fetch = (connection, expression, id, onStatesDidChange) => {
  return ensurePeer(connection)
    .then((peer) => {
      const {url, user, password} = connection
      const fid = [url, user, password, id].join('--')
      let fetcher = fetchers[fid]
      if (fetcher) {
        fetcher.unfetch()
      }
      fetcher = new Fetcher()
        .expression(expression)
        .on('data', onStatesDidChange)
      fetchers[fid] = fetcher
      return peer.fetch(fetcher)
    })
}

export const set = (connection, path, value) => {
  return ensurePeer(connection)
    .then((peer) => {
      return peer.set(path, value)
    })
}

export const call = (connection, path, args) => {
  return ensurePeer(connection)
    .then((peer) => {
      return peer.call(path, args)
    })
}

export const get = (connection, expression) => {
  return ensurePeer(connection)
    .then((peer) => {
      return peer.get(expression)
    })
}
