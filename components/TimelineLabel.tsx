import type { NextPage } from 'next';
import type { Location } from '../pages/index';

// Adds classes to position timeline label based on transit status
const timelineLabelClasses = (locations: Location[], index: number): String => {
    // if location is inTransit and next location is inTransit, positiion label at the bottom
    if (locations[index].inTransit && locations[index + 1] && locations[index + 1].inTransit) { 
        return "self-end"
    }
    // else if location is static, label is sticky
    else if (!locations[index].inTransit) {
        return "sticky self-start"
    }
    // else hide timeline label
    else { 
        return "hidden"
    }
}

// Returns timeline location label text based on transit status
const timelineLabelText = (locations: Location[], index: number): String => {
    // if location is inTransit and next location is inTransit show the inTransitFrom location,
    if (locations[index].inTransit && locations[index + 1] && locations[index + 1].inTransit) {
        return locations[index].inTransitFrom
    }
    // else if location is static show location
    else if (!locations[index].inTransit) {
        return locations[index].name
    }
    // else (location is inTransit) dont show label
    else {
        return ""
    }
}

type TimelineProps = {
    locations: Location[];
    index: number;
}

const TimelineLabel: NextPage<TimelineProps> = ({locations, index}: TimelineProps) => {

    return (
        <>
            <div className={"timeline-labels flex align-stretch justify-end mb-1 " + timelineLabelClasses(locations, index)} style={{ top: "30vh" }}>
                <div className="timeline-date mr-16">
                    <p className="text-2xl">{timelineLabelText(locations, index)}</p>
                </div>
                <div className="timeline-circle border-4 border-white bg-black rounded-full w-6 h-6 my-auto"></div>
            </div>
            {/* if location is inTransit render dotted line */}
            <div className={`timeline-line border-x-4 border-black h-full -left-2 relative ${locations[index].inTransit ? "border-dashed" : ""}`} style={{ zIndex: "-2", left: "-16px" }}></div>
        </>
    )
}

export default TimelineLabel;