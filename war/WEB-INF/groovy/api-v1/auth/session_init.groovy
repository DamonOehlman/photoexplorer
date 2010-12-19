import geominer.v1.types.UserSession;
import geominer.Dumper;

// create the session
def session = UserSession.create();

// dump the response to the specified stream
Dumper.dump(response, session, params.callback);