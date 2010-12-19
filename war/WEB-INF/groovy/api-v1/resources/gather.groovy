import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.JsonNode;
import geominer.v1.types.*;
import geominer.Dumper;

public class GatherResult {
    Integer totalGathered;
}

// TODO: replace this with an error checking class
if ((! params.id) || (! params.sessionid)) {
    response.outputStream << 'error'
    return;
}

// calculate the quantity
// TODO: error checking
Integer requestQty = params.qty ? new Integer(params.qty) : 1;

// gather the resources
def results = {
    totalGathered: Resource.gather(datastore, params.id, params.sessionid, requestQty);
};

// dump the response to the specified stream
Dumper.dump(response, results as GatherResult, params.callback, new ObjectMapper());