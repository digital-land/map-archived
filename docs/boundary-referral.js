// Initial map view
var map = L.map('map', {
  preferCanvas: true,
  fullscreenControl: true
}).setView([52.561928, -1.464854], 7)

// Tile layers
L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  id: 'base',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

// Sidebar
var sidebar = L.control.sidebar('sidebar', {
  position: 'right'
})

map.addControl(sidebar)

// Brownfield Features
var brownfieldFeatures = brownfield.map(function (point) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.longitude, point.latitude]
    },
    properties: point
  }
})

// Local authority boundaries (England only)
geoJson = geoJson.features.filter(function (item) {
  return item.properties.lad19cd.startsWith('E')
}).map(function (item) {
  var lad19cd = item.properties.lad19cd
  if (item.properties.lad19cd === 'E06000057') {
    // Northumberland
    lad19cd = 'E06000048'
  } else if (item.properties.lad19cd === 'E07000240') {
    // St Albans
    lad19cd = 'E07000100'
  } else if (item.properties.lad19cd === 'E07000241') {
    // Welwyn Hatfield
    lad19cd = 'E07000104'
  } else if (item.properties.lad19cd === 'E07000242') {
    // East Hertfordshire
    lad19cd = 'E07000097'
  } else if (item.properties.lad19cd === 'E07000243') {
    // Stevenage
    lad19cd = 'E07000101'
  } else if (item.properties.lad19cd === 'E08000037') {
    // Gateshead
    lad19cd = 'E08000020'
  }

  item.properties.organisation = organisations.find(function (organisation) {
    if (organisation['statistical-geography'] && organisation['statistical-geography'].length) {
      return organisation['statistical-geography'].toString().toLowerCase() === lad19cd.toString().toLowerCase()
    }
  })

  return item
})

L.geoJSON(geoJson, {
  style: {
    fillOpacity: 0,
    weight: 2,
    color: 'gray'
  },
  onEachFeature: function (feature, layer) {
    // var count = feature.properties.organisation ? feature.properties.organisation['point-count'].toString() : '0'

    if (!feature.properties.organisation) {
      layer.setStyle({
        fillColor: 'red',
        fillOpacity: 0.25
      })

      console.log(feature.properties)
    } else {
      var thisOrganisationsFeatures = brownfieldFeatures.filter(function (brownfieldFeature) {
        if (brownfieldFeature.properties.organisation.toLowerCase() === feature.properties.organisation.organisation.toLowerCase()) {
          return true
        }
        return false
      })

      var brownfieldMarkers = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        spiderfyOnMaxZoom: false,
        removeOutsideVisibleBounds: true,
        animate: false,
        disableClusteringAtZoom: 11,
        maxClusterRadius: 600,
        singleMarkerMode: false
      })
      var brownfieldOnMap = L.geoJSON({
        type: 'FeatureCollection',
        features: thisOrganisationsFeatures
      }, {
        pointToLayer: function (feature, latlng) {
          var size = isNaN(feature.properties.hectares) ? 100 : (Math.sqrt((feature.properties.hectares * 10000) / Math.PI))
          return L.circle(latlng, { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: size.toFixed(2) })
        },
        onEachFeature: function (feature, layer) {
          layer.on({
            click: function () {
              sidebar.setContent('<h2>Loading...</h2>')
              sidebar.show()
              console.log(feature, layer)

              return Papa.parse('data/brownfield/' + feature.properties.organisation.toLowerCase().replace(':', '-') + '.csv', {
                download: true,
                header: true,
                complete: function (results) {
                  console.log(results, results.data)

                  var point = results.data.find(function (row) {
                    return (row.latitude === feature.properties.latitude.toString()) && (row.longitude === feature.properties.longitude.toString())
                  })

                  if (point) {
                    content = ''

                    Object.keys(point).forEach(function (key) {
                      content = content + key + ': ' + point[key] + '<br>'
                    })
                  } else {
                    content = '<h2>Point not found - debug info:</h2><pre>' + JSON.stringify(results.data) + '</pre><h3>Looking for a row with latitude, longitude:</h3>' + feature.properties.latitude.toString() + ',' + feature.properties.longitude.toString()
                  }

                  sidebar.setContent(content)
                }
              })
            }
          })
        }
      })

      brownfieldMarkers.addLayer(brownfieldOnMap)
      map.addLayer(brownfieldMarkers)
    }

    layer.on({
      mouseover: function () {
        this.setStyle({
          fillColor: 'black',
          fillOpacity: 0.25
        })
      },
      mouseout: function () {
        this.setStyle({
          fillColor: 'white',
          fillOpacity: 0
        })
      },
      click: function () {
        return map.fitBounds(layer.getBounds())
      }
    })
  }
}).addTo(map)
