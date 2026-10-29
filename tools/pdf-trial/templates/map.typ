// Converts the placeholder map to PDF for LuaLaTeX, which can't place SVG images.
#let w = float(sys.inputs.at("w")) * 1mm
#let h = float(sys.inputs.at("h")) * 1mm
#set page(width: w, height: h, margin: 0pt)
#image("map.svg", width: w, height: h)
