-- This is an example of what the table schema files should look like

DROP TABLE IF EXISTS example_table;

CREATE TABLE example_table (
	id GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	datacol VARCHAR(50) NOT NULL,
	numcol INT NOT NULL UNIQUE,
	boolcol BOOLEAN DEFAULT false
);
