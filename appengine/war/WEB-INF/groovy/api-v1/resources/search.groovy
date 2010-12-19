import com.google.appengine.api.urlfetch.HTTPResponse;
import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.JsonNode;
import geominer.v1.types.*;
import geominer.v1.results.ResourceSearch;
import geominer.Dumper;

// TODO: read the game configuration

URL gowallaSpots = new URL('http://api.gowalla.com/spots');

// TODO: replace this with an error checking class
if ((! params.lat) || (! params.lng)) {
    response.outputStream << 'error'
    return;
}

// issue the gowalla request
HTTPResponse gowallaResp = gowallaSpots.get(
    params: [
        lat: params.lat,
        lng: params.lng,
        radius: params.radius ? params.radius : '50',
        per_page: '100'
    ],
    headers: [
        'Accept': 'application/json',
        'X-Gowalla-API-Key': '527c5583d0304ffa8a02743d901a73c7'
    ]);
    
// parse the response using jackson

ObjectMapper mapper = new ObjectMapper();
JsonNode rootNode = mapper.readValue(gowallaResp.text, JsonNode.class);

// create the resource container object
ResourceType resType = new ResourceType();
resType.typeName = 'dirt';

rootNode.spots.each { spot ->
    // create the new resource
    Resource resource = new Resource();
    
    // initialise the resource details
    resource.id = (spot.checkins_url.valueAsText =~ /.*?(\d+)$/).replaceAll('$1')
    resource.name = spot.name.valueAsText;
    resource.lat = new Double(spot.lat.valueAsText);
    resource.lng = new Double(spot.lng.valueAsText);
    resource.total = spot.checkins_count.intValue;
    
    // check the availability of the resource
    resource.checkAvailability(datastore);
    
    // add to the resource types list of resources
    resType.deposits << resource;
}

ResourceSearch searchResults = new ResourceSearch();
searchResults.resourceTypes << resType;

// dump the response to the specified stream
Dumper.dump(response, searchResults, params.callback, mapper);
    
// response.outputStream << rootNode