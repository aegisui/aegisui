# Contrato: fixture que se exime de matriz visual MINTIENDO

**Sin matriz visual:** primitivo headless, no renderiza

Y es **falso**: este contrato tiene una historia propia
(`componentes-fixture-bad-fake-headless--default`, declarada en `FIXTURE_STORIES`
del gate `coverage`), así que sí renderiza.

Es el objetivo rojo permanente de la **puerta trasera** de ADR-023: si la
exención headless se concediera solo por estar escrita, cualquier componente con
apariencia podría copiar esa línea y saltarse el gate `coverage` entero. La
exención se declara **y** se verifica.

No se corrige: quitarle la historia de `FIXTURE_STORIES`, o borrarle el marcador,
dejaría la puerta trasera sin canario — y `fixtureCoverage()` del gate lo caza.
