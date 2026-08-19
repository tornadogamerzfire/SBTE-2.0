/**
 * SBTE 2.0 Cloudflare Worker
 *
 * Production API for:
 *   GET /api/health
 *   GET /api/resources
 *   GET /api/pdf
 *
 * PDFs are read exclusively from the SBTE_PDFS R2 binding.
 * No local filesystem, Flask server, GitHub runtime fetch, or PDF processing is used.
 */

const ALLOWED_ORIGINS = new Set([
  "https://sbte-2-0.pages.dev",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

const VALID_TYPES = new Set(["notes", "pyq", "practical"]);
const MAX_PARAM_LENGTH = 300;

// Trusted curriculum data generated from frontend/data/subjects.json in the
// supplied repository. Request values are only used to look up these records;
// R2 paths are built from the trusted folder fields below.
const CURRICULUM = {"branches":[{"id":"civil","name":"Civil Engineering","folder":"Civil Engineering","semesters":[{"number":1,"subjects":[{"id":"basic-engg-mathematics","name":"Basic Engg. Mathematics","folder":"Basic Engg. Mathematics","type":"normal"},{"id":"applied-chemistry-a","name":"Applied Chemistry -A","folder":"Applied Chemistry -A","type":"normal"},{"id":"fundamentals-of-mechanical-engg","name":"Fundamentals of Mechanical Engg.","folder":"Fundamentals of Mechanical Engg","type":"normal"},{"id":"communication-skills-english","name":"Communication Skills (English)","folder":"Communication Skills (English)","type":"normal"},{"id":"engg-drawing-graphics","name":"Engg. Drawing & Graphics","folder":"Engg. Drawing & Graphics","type":"normal"}]},{"number":2,"subjects":[{"id":"applied-physics-a","name":"Applied Physics -A","folder":"Applied Physics -A","type":"normal"},{"id":"python-programming","name":"Python Programming","folder":"Python Programming","type":"normal"},{"id":"engg-mechanics","name":"Engg. Mechanics","folder":"Engg. Mechanics","type":"normal"},{"id":"applied-mathematics-a","name":"Applied Mathematics -A","folder":"Applied Mathematics -A","type":"normal"}]},{"number":3,"subjects":[{"id":"basic-surveying","name":"Basic Surveying","folder":"Basic Surveying","type":"normal"},{"id":"concrete-technology","name":"Concrete Technology","folder":"Concrete Technology","type":"normal"},{"id":"strength-of-material-for-civil-engg","name":"Strength of Material for Civil Engg.","folder":"Strength of Material for Civil Engg","type":"normal"},{"id":"building-construction-material","name":"Building Construction & Material","folder":"Building Construction & Material","type":"normal"},{"id":"water-resource-engg","name":"Water Resource Engg.","folder":"Water Resource Engg","type":"normal"}]},{"number":4,"subjects":[{"id":"advance-surveying","name":"Advance Surveying","folder":"Advance Surveying","type":"normal"},{"id":"theory-of-structure","name":"Theory of Structure","folder":"Theory of Structure","type":"normal"},{"id":"building-planning-and-drawing-with-auto-cad","name":"Building Planning and Drawing with Auto CAD","folder":"Building Planning and Drawing with Auto CAD","type":"normal"},{"id":"soil-mechanics-foundation","name":"Soil Mechanics & Foundation","folder":"Soil Mechanics & Foundation","type":"normal"},{"id":"transportation-engg","name":"Transportation Engg.","folder":"Transportation Engg","type":"normal"}]},{"number":5,"subjects":[{"id":"hydraulics","name":"Hydraulics","folder":"Hydraulics","type":"normal"},{"id":"rcc-structure","name":"RCC Structure","folder":"RCC Structure","type":"normal"},{"id":"estimating-costing-contracts","name":"Estimating, Costing & Contracts","folder":"Estimating, Costing & Contracts","type":"normal"},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-basic","name":"Artificial Intelligence (Basic)","folder":"Artificial Intelligence (Basic)"},{"id":"internet-of-things-basic","name":"Internet of Things (Basic)","folder":"Internet of Things (Basic)"},{"id":"drone-technology-basic","name":"Drone Technology (Basic)","folder":"Drone Technology (Basic)"},{"id":"3d-printing-and-design-basic","name":"3D Printing and Design (Basic)","folder":"3D Printing and Design (Basic)"},{"id":"industrial-automation-basic","name":"Industrial Automation (Basic)","folder":"Industrial Automation (Basic)"},{"id":"electric-vehicle-basic","name":"Electric Vehicle (Basic)","folder":"Electric Vehicle (Basic)"},{"id":"robotics-basic","name":"Robotics (Basic)","folder":"Robotics (Basic)"},{"id":"transformer-manufacturing-and-repairing-basic","name":"Transformer Manufacturing and Repairing (Basic)","folder":"Transformer Manufacturing and Repairing (Basic)"},{"id":"optical-fiber-and-5g-communication-basic","name":"Optical Fiber and 5G Communication (Basic)","folder":"Optical Fiber and 5G Communication (Basic)"}]}]},{"number":6,"subjects":[{"id":"environmental-engg","name":"Environmental Engg.","folder":"Environmental Engg","type":"normal"},{"id":"steel-structure","name":"Steel Structure","folder":"Steel Structure","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"pre-stress-and-precast-concrete","name":"Pre-Stress and Precast Concrete","folder":"Pre-Stress and Precast Concrete"},{"id":"traffic-engineering-and-pavement-design","name":"Traffic Engineering and Pavement Design","folder":"Traffic Engineering and Pavement Design"},{"id":"green-building-and-sustainability","name":"Green Building and Sustainability","folder":"Green Building and Sustainability"},{"id":"water-and-waste-water-management","name":"Water and Waste Water Management","folder":"Water and Waste Water Management"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-advanced","name":"Artificial Intelligence (Advanced)","folder":"Artificial Intelligence (Advanced)"},{"id":"internet-of-things-advanced","name":"Internet of Things (Advanced)","folder":"Internet of Things (Advanced)"},{"id":"drone-technology-advanced","name":"Drone Technology (Advanced)","folder":"Drone Technology (Advanced)"},{"id":"3d-printing-and-design-advanced","name":"3D Printing and Design (Advanced)","folder":"3D Printing and Design (Advanced)"},{"id":"industrial-automation-advanced","name":"Industrial Automation (Advanced)","folder":"Industrial Automation (Advanced)"},{"id":"electric-vehicle-advanced","name":"Electric Vehicle (Advanced)","folder":"Electric Vehicle (Advanced)"},{"id":"robotics-advanced","name":"Robotics (Advanced)","folder":"Robotics (Advanced)"},{"id":"transformer-manufacturing-and-repairing-advanced","name":"Transformer Manufacturing and Repairing (Advanced)","folder":"Transformer Manufacturing and Repairing (Advanced)"},{"id":"optical-fiber-and-5g-communication-advanced","name":"Optical Fiber and 5G Communication (Advanced)","folder":"Optical Fiber and 5G Communication (Advanced)"}]}]}]},{"id":"cse","name":"Computer Science and Engineering","folder":"Computer Science and Engineering","semesters":[{"number":1,"subjects":[{"id":"basic-engg-mathematics","name":"Basic Engg. Mathematics","folder":"Basic Engg. Mathematics","type":"normal"},{"id":"applied-physics-b","name":"Applied Physics -B","folder":"Applied Physics -B","type":"normal"},{"id":"fundamentals-of-electrical-and-electronic-engg","name":"Fundamentals of Electrical and Electronic Engg.","folder":"Fundamentals of Electrical and Electronic Engg","type":"normal"},{"id":"introduction-to-artificial-intelligence","name":"Introduction to Artificial Intelligence","folder":"Introduction to Artificial Intelligence","type":"normal"},{"id":"ict-tools","name":"ICT Tools","folder":"ICT Tools","type":"normal"}]},{"number":2,"subjects":[{"id":"programming-with-c","name":"Programming with C","folder":"Programming with C","type":"normal"},{"id":"web-technology","name":"Web Technology","folder":"Web Technology","type":"normal"},{"id":"applied-chemistry-b","name":"Applied Chemistry -B","folder":"Applied Chemistry -B","type":"normal"},{"id":"communication-skills-english","name":"Communication Skills (English)","folder":"Communication Skills (English)","type":"normal"},{"id":"applied-mathematics-b","name":"Applied Mathematics -B","folder":"Applied Mathematics -B","type":"normal"}]},{"number":3,"subjects":[{"id":"data-structures-and-algorithm","name":"Data Structures and Algorithm","folder":"Data Structures and Algorithm","type":"normal"},{"id":"operating-system","name":"Operating System","folder":"Operating System","type":"normal"},{"id":"discrete-structures","name":"Discrete Structures","folder":"Discrete Structures","type":"normal"},{"id":"digital-electronics-microprocessor","name":"Digital Electronics & Microprocessor","folder":"Digital Electronics & Microprocessor","type":"normal"},{"id":"python-programming","name":"Python Programming","folder":"Python Programming","type":"normal"}]},{"number":4,"subjects":[{"id":"java-programming","name":"Java Programming","folder":"Java Programming","type":"normal"},{"id":"theory-of-computation","name":"Theory of Computation","folder":"Theory of Computation","type":"normal"},{"id":"database-management-system","name":"Database Management System","folder":"Database Management System","type":"normal"},{"id":"computer-organization-and-architecture","name":"Computer Organization and Architecture","folder":"Computer Organization and Architecture","type":"normal"},{"id":"computer-troubleshooting-and-maintenance","name":"Computer Troubleshooting and Maintenance","folder":"Computer Troubleshooting and Maintenance","type":"normal"}]},{"number":5,"subjects":[{"id":"data-communication-and-computer-network","name":"Data Communication and Computer Network","folder":"Data Communication and Computer Network","type":"normal"},{"id":"software-engineering","name":"Software Engineering","folder":"Software Engineering","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"data-science-data-warehousing-and-data-mining","name":"Data Science: Data Warehousing and Data Mining","folder":"Data Science - Data Warehousing and Data Mining"},{"id":"advanced-java-programming","name":"Advanced JAVA Programming","folder":"Advanced JAVA Programming"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-basic","name":"Artificial Intelligence (Basic)","folder":"Artificial Intelligence (Basic)"},{"id":"internet-of-things-basic","name":"Internet of Things (Basic)","folder":"Internet of Things (Basic)"},{"id":"drone-technology-basic","name":"Drone Technology (Basic)","folder":"Drone Technology (Basic)"},{"id":"3d-printing-and-design-basic","name":"3D Printing and Design (Basic)","folder":"3D Printing and Design (Basic)"},{"id":"industrial-automation-basic","name":"Industrial Automation (Basic)","folder":"Industrial Automation (Basic)"},{"id":"electric-vehicle-basic","name":"Electric Vehicle (Basic)","folder":"Electric Vehicle (Basic)"},{"id":"robotics-basic","name":"Robotics (Basic)","folder":"Robotics (Basic)"},{"id":"transformer-manufacturing-and-repairing-basic","name":"Transformer Manufacturing and Repairing (Basic)","folder":"Transformer Manufacturing and Repairing (Basic)"},{"id":"optical-fiber-and-5g-communication-basic","name":"Optical Fiber and 5G Communication (Basic)","folder":"Optical Fiber and 5G Communication (Basic)"}]}]},{"number":6,"subjects":[{"id":"cloud-computing","name":"Cloud Computing","folder":"Cloud Computing","type":"normal"},{"id":"computer-network-with-linux-windows","name":"Computer Network with Linux & Windows","folder":"Computer Network with Linux & Windows","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"introduction-to-machine-learning","name":"Introduction to Machine Learning","folder":"Introduction to Machine Learning"},{"id":"mobile-application-development","name":"Mobile Application Development","folder":"Mobile Application Development"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-advanced","name":"Artificial Intelligence (Advanced)","folder":"Artificial Intelligence (Advanced)"},{"id":"internet-of-things-advanced","name":"Internet of Things (Advanced)","folder":"Internet of Things (Advanced)"},{"id":"drone-technology-advanced","name":"Drone Technology (Advanced)","folder":"Drone Technology (Advanced)"},{"id":"3d-printing-and-design-advanced","name":"3D Printing and Design (Advanced)","folder":"3D Printing and Design (Advanced)"},{"id":"industrial-automation-advanced","name":"Industrial Automation (Advanced)","folder":"Industrial Automation (Advanced)"},{"id":"electric-vehicle-advanced","name":"Electric Vehicle (Advanced)","folder":"Electric Vehicle (Advanced)"},{"id":"robotics-advanced","name":"Robotics (Advanced)","folder":"Robotics (Advanced)"},{"id":"transformer-manufacturing-and-repairing-advanced","name":"Transformer Manufacturing and Repairing (Advanced)","folder":"Transformer Manufacturing and Repairing (Advanced)"},{"id":"optical-fiber-and-5g-communication-advanced","name":"Optical Fiber and 5G Communication (Advanced)","folder":"Optical Fiber and 5G Communication (Advanced)"}]}]}]},{"id":"mechanical","name":"Mechanical Engineering","folder":"Mechanical Engineering","semesters":[{"number":1,"subjects":[{"id":"basic-engg-mathematics","name":"Basic Engg. Mathematics","folder":"Basic Engg. Mathematics","type":"normal"},{"id":"applied-chemistry-a","name":"Applied Chemistry -A","folder":"Applied Chemistry -A","type":"normal"},{"id":"introduction-to-artificial-intelligence","name":"Introduction to Artificial Intelligence","folder":"Introduction to Artificial Intelligence","type":"normal"},{"id":"communication-skills-english","name":"Communication Skills (English)","folder":"Communication Skills (English)","type":"normal"},{"id":"engineering-drawing","name":"Engineering Drawing","folder":"Engineering Drawing","type":"normal"}]},{"number":2,"subjects":[{"id":"applied-physics-a","name":"Applied Physics -A","folder":"Applied Physics -A","type":"normal"},{"id":"fundamentals-of-electrical-and-electronic-engg","name":"Fundamentals of Electrical and Electronic Engg.","folder":"Fundamentals of Electrical and Electronic Engg","type":"normal"},{"id":"engg-mechanics","name":"Engg. Mechanics","folder":"Engg. Mechanics","type":"normal"},{"id":"applied-mathematics-a","name":"Applied Mathematics -A","folder":"Applied Mathematics -A","type":"normal"}]},{"number":3,"subjects":[{"id":"manufacturing-engineering","name":"Manufacturing Engineering","folder":"Manufacturing Engineering","type":"normal"},{"id":"material-science-engineering","name":"Material Science & Engineering","folder":"Material Science & Engineering","type":"normal"},{"id":"strength-of-materials-for-mechanical-engg","name":"Strength of Materials for Mechanical Engg.","folder":"Strength of Materials for Mechanical Engg","type":"normal"},{"id":"basic-thermodynamics","name":"Basic Thermodynamics","folder":"Basic Thermodynamics","type":"normal"}]},{"number":4,"subjects":[{"id":"engineering-metrology-and-instrumentation","name":"Engineering Metrology and Instrumentation","folder":"Engineering Metrology and Instrumentation","type":"normal"},{"id":"fluid-mechanics-hydraulic-machinery","name":"Fluid Mechanics & Hydraulic Machinery","folder":"Fluid Mechanics & Hydraulic Machinery","type":"normal"},{"id":"applied-thermodynamics-and-hvac","name":"Applied Thermodynamics and HVAC","folder":"Applied Thermodynamics and HVAC","type":"normal"},{"id":"theory-of-machines","name":"Theory of Machines","folder":"Theory of Machines","type":"normal"},{"id":"advance-manufacturing-engineering-and-cost-estimation","name":"Advance Manufacturing Engineering and Cost Estimation","folder":"Advance Manufacturing Engineering and Cost Estimation","type":"normal"}]},{"number":5,"subjects":[{"id":"industrial-engineering-management","name":"Industrial Engineering & Management","folder":"Industrial Engineering & Management","type":"normal"},{"id":"industrial-automation-and-mechatronics","name":"Industrial Automation and Mechatronics","folder":"Industrial Automation and Mechatronics","type":"normal"},{"id":"hybrid-automobile-engineering","name":"Hybrid Automobile Engineering","folder":"Hybrid Automobile Engineering","type":"normal"},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-basic","name":"Artificial Intelligence (Basic)","folder":"Artificial Intelligence (Basic)"},{"id":"internet-of-things-basic","name":"Internet of Things (Basic)","folder":"Internet of Things (Basic)"},{"id":"drone-technology-basic","name":"Drone Technology (Basic)","folder":"Drone Technology (Basic)"},{"id":"3d-printing-and-design-basic","name":"3D Printing and Design (Basic)","folder":"3D Printing and Design (Basic)"},{"id":"industrial-automation-basic","name":"Industrial Automation (Basic)","folder":"Industrial Automation (Basic)"},{"id":"electric-vehicle-basic","name":"Electric Vehicle (Basic)","folder":"Electric Vehicle (Basic)"},{"id":"robotics-basic","name":"Robotics (Basic)","folder":"Robotics (Basic)"},{"id":"transformer-manufacturing-and-repairing-basic","name":"Transformer Manufacturing and Repairing (Basic)","folder":"Transformer Manufacturing and Repairing (Basic)"},{"id":"optical-fiber-and-5g-communication-basic","name":"Optical Fiber and 5G Communication (Basic)","folder":"Optical Fiber and 5G Communication (Basic)"}]}]},{"number":6,"subjects":[{"id":"design-of-machine-elements","name":"Design of Machine Elements","folder":"Design of Machine Elements","type":"normal"},{"id":"maintenance-safety-of-mechanical-solar-appliances","name":"Maintenance & Safety of Mechanical & Solar Appliances","folder":"Maintenance & Safety of Mechanical & Solar Appliances","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"heat-and-mass-transfer","name":"Heat and Mass Transfer","folder":"Heat and Mass Transfer"},{"id":"power-plant-engineering","name":"Power Plant Engineering","folder":"Power Plant Engineering"},{"id":"press-tool-jigs-and-fixtures","name":"Press Tool, Jigs and Fixtures","folder":"Press Tool, Jigs and Fixtures"},{"id":"hydraulic-pneumatic-controls","name":"Hydraulic & Pneumatic Controls","folder":"Hydraulic & Pneumatic Controls"},{"id":"renewable-and-alternate-energy-sources","name":"Renewable and Alternate Energy Sources","folder":"Renewable and Alternate Energy Sources"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-advanced","name":"Artificial Intelligence (Advanced)","folder":"Artificial Intelligence (Advanced)"},{"id":"internet-of-things-advanced","name":"Internet of Things (Advanced)","folder":"Internet of Things (Advanced)"},{"id":"drone-technology-advanced","name":"Drone Technology (Advanced)","folder":"Drone Technology (Advanced)"},{"id":"3d-printing-and-design-advanced","name":"3D Printing and Design (Advanced)","folder":"3D Printing and Design (Advanced)"},{"id":"industrial-automation-advanced","name":"Industrial Automation (Advanced)","folder":"Industrial Automation (Advanced)"},{"id":"electric-vehicle-advanced","name":"Electric Vehicle (Advanced)","folder":"Electric Vehicle (Advanced)"},{"id":"robotics-advanced","name":"Robotics (Advanced)","folder":"Robotics (Advanced)"},{"id":"transformer-manufacturing-and-repairing-advanced","name":"Transformer Manufacturing and Repairing (Advanced)","folder":"Transformer Manufacturing and Repairing (Advanced)"},{"id":"optical-fiber-and-5g-communication-advanced","name":"Optical Fiber and 5G Communication (Advanced)","folder":"Optical Fiber and 5G Communication (Advanced)"}]}]}]},{"id":"electrical","name":"Electrical Engineering","folder":"Electrical Engineering","semesters":[{"number":1,"subjects":[{"id":"basic-engg-mathematics","name":"Basic Engg. Mathematics","folder":"Basic Engg. Mathematics","type":"normal"},{"id":"applied-physics-b","name":"Applied Physics -B","folder":"Applied Physics -B","type":"normal"},{"id":"basic-electrical-engg","name":"Basic Electrical Engg.","folder":"Basic Electrical Engg","type":"normal"},{"id":"engg-drawing-graphics","name":"Engg. Drawing & Graphics","folder":"Engg. Drawing & Graphics","type":"normal"},{"id":"introduction-to-artificial-intelligence","name":"Introduction to Artificial Intelligence","folder":"Introduction to Artificial Intelligence","type":"normal"}]},{"number":2,"subjects":[{"id":"fundamentals-of-electronics-engg","name":"Fundamentals of Electronics Engg.","folder":"Fundamentals of Electronics Engg","type":"normal"},{"id":"applied-chemistry-b","name":"Applied Chemistry -B","folder":"Applied Chemistry -B","type":"normal"},{"id":"communication-skills-english","name":"Communication Skills (English)","folder":"Communication Skills (English)","type":"normal"},{"id":"engg-mechanics","name":"Engg. Mechanics","folder":"Engg. Mechanics","type":"normal"},{"id":"applied-mathematics-c","name":"Applied Mathematics -C","folder":"Applied Mathematics -C","type":"normal"}]},{"number":3,"subjects":[{"id":"electrical-circuit-and-networks","name":"Electrical Circuit and Networks","folder":"Electrical Circuit and Networks","type":"normal"},{"id":"electrical-measurements-and-instrumentation","name":"Electrical Measurements and Instrumentation","folder":"Electrical Measurements and Instrumentation","type":"normal"},{"id":"dc-machines-and-transformers","name":"DC Machines and Transformers","folder":"DC Machines and Transformers","type":"normal"},{"id":"electrical-power-generation-transmission-and-distribution","name":"Electrical Power Generation Transmission and Distribution","folder":"Electrical Power Generation Transmission and Distribution","type":"normal"},{"id":"python-programming","name":"Python Programming","folder":"Python Programming","type":"normal"}]},{"number":4,"subjects":[{"id":"power-electronics","name":"Power Electronics","folder":"Power Electronics","type":"normal"},{"id":"microprocessor-and-microcontrollers","name":"Microprocessor and Microcontrollers","folder":"Microprocessor and Microcontrollers","type":"normal"},{"id":"ac-machines","name":"AC Machines","folder":"AC Machines","type":"normal"},{"id":"control-system-and-plc","name":"Control System and PLC","folder":"Control System and PLC","type":"normal"},{"id":"electrical-software-lab","name":"Electrical Software Lab","folder":"Electrical Software Lab","type":"normal"}]},{"number":5,"subjects":[{"id":"switchgear-and-protection","name":"Switchgear and Protection","folder":"Switchgear and Protection","type":"normal"},{"id":"solar-wind-power-technology","name":"Solar & Wind Power Technology","folder":"Solar & Wind Power Technology","type":"normal"},{"id":"energy-conservation-and-audit","name":"Energy Conservation and Audit","folder":"Energy Conservation and Audit","type":"normal"},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-basic","name":"Artificial Intelligence (Basic)","folder":"Artificial Intelligence (Basic)"},{"id":"internet-of-things-basic","name":"Internet of Things (Basic)","folder":"Internet of Things (Basic)"},{"id":"drone-technology-basic","name":"Drone Technology (Basic)","folder":"Drone Technology (Basic)"},{"id":"3d-printing-and-design-basic","name":"3D Printing and Design (Basic)","folder":"3D Printing and Design (Basic)"},{"id":"industrial-automation-basic","name":"Industrial Automation (Basic)","folder":"Industrial Automation (Basic)"},{"id":"electric-vehicle-basic","name":"Electric Vehicle (Basic)","folder":"Electric Vehicle (Basic)"},{"id":"robotics-basic","name":"Robotics (Basic)","folder":"Robotics (Basic)"},{"id":"transformer-manufacturing-and-repairing-basic","name":"Transformer Manufacturing and Repairing (Basic)","folder":"Transformer Manufacturing and Repairing (Basic)"},{"id":"optical-fiber-and-5g-communication-basic","name":"Optical Fiber and 5G Communication (Basic)","folder":"Optical Fiber and 5G Communication (Basic)"}]}]},{"number":6,"subjects":[{"id":"utilization-of-electrical-energy","name":"Utilization of Electrical Energy","folder":"Utilization of Electrical Energy","type":"normal"},{"id":"electrical-installation-testing-and-commissioning","name":"Electrical Installation, Testing and Commissioning","folder":"Electrical Installation, Testing and Commissioning","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"data-communication","name":"Data Communication","folder":"Data Communication"},{"id":"industrial-drives","name":"Industrial Drives","folder":"Industrial Drives"},{"id":"electrification-of-building-complexes","name":"Electrification of Building Complexes","folder":"Electrification of Building Complexes"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-advanced","name":"Artificial Intelligence (Advanced)","folder":"Artificial Intelligence (Advanced)"},{"id":"internet-of-things-advanced","name":"Internet of Things (Advanced)","folder":"Internet of Things (Advanced)"},{"id":"drone-technology-advanced","name":"Drone Technology (Advanced)","folder":"Drone Technology (Advanced)"},{"id":"3d-printing-and-design-advanced","name":"3D Printing and Design (Advanced)","folder":"3D Printing and Design (Advanced)"},{"id":"industrial-automation-advanced","name":"Industrial Automation (Advanced)","folder":"Industrial Automation (Advanced)"},{"id":"electric-vehicle-advanced","name":"Electric Vehicle (Advanced)","folder":"Electric Vehicle (Advanced)"},{"id":"robotics-advanced","name":"Robotics (Advanced)","folder":"Robotics (Advanced)"},{"id":"transformer-manufacturing-and-repairing-advanced","name":"Transformer Manufacturing and Repairing (Advanced)","folder":"Transformer Manufacturing and Repairing (Advanced)"},{"id":"optical-fiber-and-5g-communication-advanced","name":"Optical Fiber and 5G Communication (Advanced)","folder":"Optical Fiber and 5G Communication (Advanced)"}]}]}]},{"id":"electronics","name":"Electronics Engineering","folder":"Electronics Engineering","semesters":[{"number":1,"subjects":[{"id":"basic-engg-mathematics","name":"Basic Engg. Mathematics","folder":"Basic Engg. Mathematics","type":"normal"},{"id":"applied-physics-b","name":"Applied Physics -B","folder":"Applied Physics -B","type":"normal"},{"id":"applied-chemistry-b","name":"Applied Chemistry -B","folder":"Applied Chemistry -B","type":"normal"},{"id":"engg-mechanics","name":"Engg. Mechanics","folder":"Engg. Mechanics","type":"normal"}]},{"number":2,"subjects":[{"id":"basic-electronics-engg","name":"Basic Electronics Engg.","folder":"Basic Electronics Engg","type":"normal"},{"id":"electric-circuits-and-machines","name":"Electric Circuits and Machines","folder":"Electric Circuits and Machines","type":"normal"},{"id":"communication-skills-english","name":"Communication Skills (English)","folder":"Communication Skills (English)","type":"normal"},{"id":"applied-mathematics-c","name":"Applied Mathematics -C","folder":"Applied Mathematics -C","type":"normal"},{"id":"fundamentals-of-it-and-c-programming","name":"Fundamentals of IT and C Programming","folder":"Fundamentals of IT and C Programming","type":"normal"}]},{"number":3,"subjects":[{"id":"analog-electronics","name":"Analog Electronics","folder":"Analog Electronics","type":"normal"},{"id":"measuring-instruments-and-sensors","name":"Measuring Instruments and Sensors","folder":"Measuring Instruments and Sensors","type":"normal"},{"id":"digital-electronics","name":"Digital Electronics","folder":"Digital Electronics","type":"normal"},{"id":"principles-of-electronic-communication","name":"Principles of Electronic Communication","folder":"Principles of Electronic Communication","type":"normal"},{"id":"electronic-simulation-software-practice","name":"Electronic Simulation Software Practice","folder":"Electronic Simulation Software Practice","type":"normal"}]},{"number":4,"subjects":[{"id":"linear-integrated-circuit","name":"Linear Integrated Circuit","folder":"Linear Integrated Circuit","type":"normal"},{"id":"microcontroller-and-its-applications","name":"Microcontroller and its Applications","folder":"Microcontroller and its Applications","type":"normal"},{"id":"digital-communication","name":"Digital Communication","folder":"Digital Communication","type":"normal"},{"id":"electronic-equipment-maintenance","name":"Electronic Equipment Maintenance","folder":"Electronic Equipment Maintenance","type":"normal"},{"id":"python-programming","name":"Python Programming","folder":"Python Programming","type":"normal"}]},{"number":5,"subjects":[{"id":"industrial-engineering-management","name":"Industrial Engineering & Management","folder":"Industrial Engineering & Management","type":"normal"},{"id":"antennas-and-microwave-engineering","name":"Antennas and Microwave Engineering","folder":"Antennas and Microwave Engineering","type":"normal"},{"id":"automated-control-system-and-plc","name":"Automated Control System and PLC","folder":"Automated Control System and PLC","type":"normal"},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-basic","name":"Artificial Intelligence (Basic)","folder":"Artificial Intelligence (Basic)"},{"id":"internet-of-things-basic","name":"Internet of Things (Basic)","folder":"Internet of Things (Basic)"},{"id":"drone-technology-basic","name":"Drone Technology (Basic)","folder":"Drone Technology (Basic)"},{"id":"3d-printing-and-design-basic","name":"3D Printing and Design (Basic)","folder":"3D Printing and Design (Basic)"},{"id":"industrial-automation-basic","name":"Industrial Automation (Basic)","folder":"Industrial Automation (Basic)"},{"id":"electric-vehicle-basic","name":"Electric Vehicle (Basic)","folder":"Electric Vehicle (Basic)"},{"id":"robotics-basic","name":"Robotics (Basic)","folder":"Robotics (Basic)"},{"id":"transformer-manufacturing-and-repairing-basic","name":"Transformer Manufacturing and Repairing (Basic)","folder":"Transformer Manufacturing and Repairing (Basic)"},{"id":"optical-fiber-and-5g-communication-basic","name":"Optical Fiber and 5G Communication (Basic)","folder":"Optical Fiber and 5G Communication (Basic)"}]}]},{"number":6,"subjects":[{"id":"data-communication-and-computer-networking","name":"Data Communication and Computer Networking","folder":"Data Communication and Computer Networking","type":"normal"},{"id":"embedded-system","name":"Embedded System","folder":"Embedded System","type":"normal"},{"id":"programme-electives","name":"Programme Electives","folder":"Programme Electives","type":"special","electives":[{"id":"artificial-intelligence-machine-learning","name":"Artificial Intelligence & Machine Learning","folder":"Artificial Intelligence & Machine Learning"},{"id":"industrial-electronics","name":"Industrial Electronics","folder":"Industrial Electronics"},{"id":"biomedical-electronics","name":"Biomedical Electronics","folder":"Biomedical Electronics"},{"id":"advance-communication-systems","name":"Advance Communication Systems","folder":"Advance Communication Systems"}]},{"id":"open-electives-coe","name":"Open Electives / COE","folder":"Open Electives - COE","type":"special","electives":[{"id":"artificial-intelligence-advanced","name":"Artificial Intelligence (Advanced)","folder":"Artificial Intelligence (Advanced)"},{"id":"internet-of-things-advanced","name":"Internet of Things (Advanced)","folder":"Internet of Things (Advanced)"},{"id":"drone-technology-advanced","name":"Drone Technology (Advanced)","folder":"Drone Technology (Advanced)"},{"id":"3d-printing-and-design-advanced","name":"3D Printing and Design (Advanced)","folder":"3D Printing and Design (Advanced)"},{"id":"industrial-automation-advanced","name":"Industrial Automation (Advanced)","folder":"Industrial Automation (Advanced)"},{"id":"electric-vehicle-advanced","name":"Electric Vehicle (Advanced)","folder":"Electric Vehicle (Advanced)"},{"id":"robotics-advanced","name":"Robotics (Advanced)","folder":"Robotics (Advanced)"},{"id":"transformer-manufacturing-and-repairing-advanced","name":"Transformer Manufacturing and Repairing (Advanced)","folder":"Transformer Manufacturing and Repairing (Advanced)"},{"id":"optical-fiber-and-5g-communication-advanced","name":"Optical Fiber and 5G Communication (Advanced)","folder":"Optical Fiber and 5G Communication (Advanced)"}]}]}]}]};

function jsonResponse(payload, status = 200, request = null, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  applyCors(headers, request);
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(payload), { status, headers });
}

function applySecurityHeaders(headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Cache-Control", "no-store");
}

function applyCors(headers, request) {
  const origin = request?.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
}

function badRequest(message, request) {
  return jsonResponse({ error: message }, 400, request);
}

function notFound(message, request) {
  return jsonResponse({ error: message || "Not found" }, 404, request);
}

function methodNotAllowed(request) {
  return jsonResponse({ error: "Method not allowed" }, 405, request, {
    "Allow": "GET, OPTIONS",
  });
}

function internalError(request) {
  return jsonResponse({ error: "Internal server error" }, 500, request);
}

function cleanParam(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length <= MAX_PARAM_LENGTH ? trimmed : "";
}

function parseCommonArgs(url) {
  const branch = cleanParam(url.searchParams.get("branch"));
  const subject = cleanParam(url.searchParams.get("subject"));
  const elective = cleanParam(url.searchParams.get("elective")) || null;
  const type = cleanParam(url.searchParams.get("type"));

  const semRaw = cleanParam(url.searchParams.get("sem"));
  const sem = semRaw === "" ? null : Number.parseInt(semRaw, 10);

  return {
    branch,
    sem: Number.isInteger(sem) ? sem : null,
    subject,
    elective,
    type,
  };
}

function findBranch(branchId) {
  return CURRICULUM.branches.find((branch) => branch.id === branchId) || null;
}

function findSemester(branch, number) {
  return branch?.semesters.find((semester) => semester.number === number) || null;
}

function findSubject(semester, subjectId) {
  return semester?.subjects.find((subject) => subject.id === subjectId) || null;
}

function findElective(subject, electiveId) {
  return subject?.electives?.find((elective) => elective.id === electiveId) || null;
}

function resolveContext(args) {
  const branch = findBranch(args.branch);
  if (!branch) return null;

  const semester = findSemester(branch, args.sem);
  if (!semester) return null;

  const subject = findSubject(semester, args.subject);
  if (!subject) return null;

  const pathParts = [
    branch.folder,
    `Semester ${semester.number}`,
    subject.folder,
  ];

  let elective = null;

  if (subject.type === "special") {
    elective = findElective(subject, args.elective);
    if (!elective) return null;
    pathParts.push(elective.folder);
  } else if (args.elective) {
    // Normal subjects must never accept an elective value.
    return null;
  }

  return { branch, semester, subject, elective, pathParts };
}

function buildPrefix(resourceType, pathParts) {
  // pathParts only come from trusted curriculum fields.
  return `${resourceType}/${pathParts.join("/")}/`;
}

function isSafePdfFilename(filename) {
  if (!filename) return false;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return false;
  if (filename !== filename.trim()) return false;
  return filename.toLowerCase().endsWith(".pdf");
}

async function listAllPdfObjects(bucket, prefix) {
  const results = [];
  let cursor;

  do {
    const page = await bucket.list({
      prefix,
      delimiter: "/",
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });

    for (const object of page.objects) {
      const relative = object.key.slice(prefix.length);
      // delimiter="/" prevents nested folders from being exposed. The extra
      // check is intentional defense-in-depth.
      if (!relative || relative.includes("/")) continue;
      if (!relative.toLowerCase().endsWith(".pdf")) continue;

      results.push({
        filename: relative,
        display_name: relative.slice(0, -4),
        size_kb: Math.round((object.size / 1024) * 10) / 10,
        modified: Math.floor(object.uploaded.getTime() / 1000),
      });
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  results.sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" })
  );

  return results;
}

function parseByteRange(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;
  if (rangeHeader.includes(",")) return { invalid: true };

  const spec = rangeHeader.slice(6).trim();
  const match = /^(\\d*)-(\\d*)$/.exec(spec);
  if (!match) return { invalid: true };

  const startRaw = match[1];
  const endRaw = match[2];

  if (!startRaw && !endRaw) return { invalid: true };

  if (!startRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { invalid: true };
    const length = Math.min(suffixLength, size);
    return {
      start: Math.max(size - length, 0),
      end: size - 1,
      length,
    };
  }

  const start = Number.parseInt(startRaw, 10);
  if (!Number.isSafeInteger(start) || start < 0 || start >= size) {
    return { invalid: true };
  }

  let end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;
  if (!Number.isSafeInteger(end) || end < start) return { invalid: true };
  end = Math.min(end, size - 1);

  return {
    start,
    end,
    length: end - start + 1,
  };
}

async function handleHealth(request) {
  return jsonResponse({ status: "ok" }, 200, request, {
    "Cache-Control": "no-store",
  });
}

async function handleResources(request, env, url) {
  const args = parseCommonArgs(url);

  if (!VALID_TYPES.has(args.type)) {
    return badRequest("type must be one of: notes, pyq, practical", request);
  }

  if (!args.branch || args.sem === null || !args.subject) {
    return badRequest("branch, sem and subject are required", request);
  }

  const context = resolveContext(args);
  if (!context) {
    return notFound("That branch/semester/subject combination was not found", request);
  }

  if (!env.SBTE_PDFS || typeof env.SBTE_PDFS.list !== "function") {
    return internalError(request);
  }

  const prefix = buildPrefix(args.type, context.pathParts);
  const files = await listAllPdfObjects(env.SBTE_PDFS, prefix);

  return jsonResponse({
    type: args.type,
    branch: context.branch.name,
    semester: context.semester.number,
    subject: context.subject.name,
    elective: context.elective ? context.elective.name : null,
    count: files.length,
    files,
  }, 200, request, {
    "Cache-Control": "no-store",
  });
}

async function handlePdf(request, env, url) {
  const args = parseCommonArgs(url);
  const filename = cleanParam(url.searchParams.get("file"));

  if (!VALID_TYPES.has(args.type)) {
    return badRequest("type must be one of: notes, pyq, practical", request);
  }

  if (!args.branch || args.sem === null || !args.subject || !filename) {
    return badRequest("branch, sem, subject and file are required", request);
  }

  if (!isSafePdfFilename(filename)) {
    return badRequest("file must be a single .pdf filename", request);
  }

  const context = resolveContext(args);
  if (!context) {
    return notFound("That branch/semester/subject combination was not found", request);
  }

  if (!env.SBTE_PDFS || typeof env.SBTE_PDFS.get !== "function") {
    return internalError(request);
  }

  const prefix = buildPrefix(args.type, context.pathParts);
  // filename has already been reduced to one safe component, while the
  // remaining path segments come only from trusted curriculum data.
  const key = `${prefix}${filename}`;

  // A filename is not an arbitrary R2 key because every path segment before
  // it came from CURRICULUM and the filename cannot contain path separators
  // or traversal markers.
  const rangeHeader = request.headers.get("Range");
  let getOptions = undefined;
  let requestedRange = null;

  if (rangeHeader) {
    const head = await env.SBTE_PDFS.head(key);
    if (!head) {
      return notFound("PDF not found", request);
    }

    requestedRange = parseByteRange(rangeHeader, head.size);
    if (!requestedRange || requestedRange.invalid) {
      return new Response(null, {
        status: 416,
        headers: new Headers({
          "Content-Range": `bytes */${head.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "application/pdf",
        }),
      });
    }

    getOptions = {
      range: {
        offset: requestedRange.start,
        length: requestedRange.length,
      },
    };
  }

  const object = await env.SBTE_PDFS.get(key, getOptions);
  if (!object || !object.body) {
    return notFound("PDF not found", request);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", "inline");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=3600");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  if (object.uploaded) headers.set("Last-Modified", object.uploaded.toUTCString());

  let status = 200;

  if (requestedRange) {
    status = 206;
    const start = requestedRange.start;
    const end = requestedRange.end;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    headers.set("Content-Length", String(requestedRange.length));
  } else if (object.size !== undefined) {
    headers.set("Content-Length", String(object.size));
  }

  applyCors(headers, request);
  // The PDF content itself may be cached, but API metadata/listing endpoints
  // must remain no-store. This split preserves fast browser PDF viewing.
  return new Response(object.body, { status, headers });
}

async function handleApi(request, env, url) {
  const pathname = url.pathname;

  if (request.method === "OPTIONS") {
    const headers = new Headers();
    applyCors(headers, request);
    applySecurityHeaders(headers);
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "GET") {
    return methodNotAllowed(request);
  }

  try {
    if (pathname === "/api/health") return await handleHealth(request);
    if (pathname === "/api/resources") return await handleResources(request, env, url);
    if (pathname === "/api/pdf") return await handlePdf(request, env, url);
    return notFound("Not found", request);
  } catch (error) {
    console.error("SBTE API error:", error);
    return internalError(request);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // This Worker is an API only. It must never become an arbitrary file
    // server for the repository or R2 bucket.
    if (request.method === "OPTIONS") {
      const headers = new Headers();
      applyCors(headers, request);
      applySecurityHeaders(headers);
      return new Response(null, { status: 204, headers });
    }

    return jsonResponse({ error: "Not found" }, 404, request);
  },
};
