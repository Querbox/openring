# @openring/protocol

Declarative descriptions of known smart ring packets — what bytes correspond to which fields, in which direction, for which characteristic. The parser uses these definitions to classify raw packets and decode their values.

New device support starts here: write a `ProtocolDefinition`, the parser picks it up.
