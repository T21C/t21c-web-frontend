/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { CompleteNav, LevelCardRev } from "../components";
import { Tooltip } from "react-tooltip";
import Select from "react-select";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";

const options = [
  { value: "chocolate", label: "Chocolate" },
  { value: "strawberry", label: "Strawberry" },
  { value: "vanilla", label: "Vanilla" },
];

const LevelPageRev = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFilterDiff, setSelectedFilterDiff] = useState(null);

  const [sort, setSort] = useState("RECENT_DESC");

  const [levels, setLevels] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancel;
    const fetchLevels = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_OFFSET_LEVEL}`,
          {
            params: { query, sort, offset: pageNumber * 10 },
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );
        const newLevels = await Promise.all(
          response.data.results.map(async (l) => {
            const additionalDataResponse = await axios.get(
              `${import.meta.env.VITE_INDIVIDUAL_PASSES}${l.id}`
            )
            return {
              id: l.id,
              creator: l.creator,
              song: l.song,
              artist: l.artist,
              dlLink: l.dlLink,
              wsLink: l.workshopLink,
              clears: additionalDataResponse.data.count,
            };
          })
        );
        setLevels((prev) =>
          pageNumber === 0 ? newLevels : [...prev, ...newLevels]
        );
        setHasMore(response.data.count > 0);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();

    return () => cancel && cancel();
  }, [query, sort, pageNumber]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPageNumber(0);
    setLevels([]);
  }
  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleSort(value) {
    setSort(value);
    setPageNumber(0);
    setLevels([]);
  }

  function resetAll(){
    setPageNumber(0)
    setSort("RECENT_DESC")
    setQuery("")
    setLoading(true)
  }

  return (
    <div className="level-page-rev">
      <CompleteNav />

      <div className="background-level"></div>

      <div className="level-body">
        <div className="input-option">
          <input
            value={query}
            type="text"
            placeholder="Search artist, song, creator"
            onChange={handleQueryChange}
          />

          <Tooltip id="filter" place="bottom" noArrow>
            filter
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            sort
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            reset
          </Tooltip>
          <svg
            style={{
              backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
            }}
            onClick={() => handleFilterOpen()}
            data-tooltip-id="filter"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
            />
          </svg>

          <svg
            style={{
              backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "",
            }}
            onClick={() => handleSortOpen()}
            data-tooltip-id="sort"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g id="SVGRepo_iconCarrier">
              {" "}
              <path
                d="M20 10.875C20.3013 10.875 20.5733 10.6948 20.6907 10.4173C20.8081 10.1399 20.7482 9.81916 20.5384 9.60289L16.5384 5.47789C16.3972 5.33222 16.2029 5.25 16 5.25C15.7971 5.25 15.6029 5.33222 15.4616 5.47789L11.4616 9.60289C11.2519 9.81916 11.1919 10.1399 11.3093 10.4173C11.4268 10.6948 11.6988 10.875 12 10.875H15.25V18C15.25 18.4142 15.5858 18.75 16 18.75C16.4142 18.75 16.75 18.4142 16.75 18L16.75 10.875H20Z"
                fill="#ffffff"
              />{" "}
              <path
                opacity="0.5"
                d="M12 13.125C12.3013 13.125 12.5733 13.3052 12.6907 13.5827C12.8081 13.8601 12.7482 14.1808 12.5384 14.3971L8.53844 18.5221C8.39719 18.6678 8.20293 18.75 8.00002 18.75C7.79711 18.75 7.60285 18.6678 7.46159 18.5221L3.46159 14.3971C3.25188 14.1808 3.19192 13.8601 3.30934 13.5827C3.42676 13.3052 3.69877 13.125 4.00002 13.125H7.25002L7.25002 6C7.25002 5.58579 7.5858 5.25 8.00002 5.25C8.41423 5.25 8.75002 5.58579 8.75002 6L8.75002 13.125L12 13.125Z"
                fill="#ffffff"
              />{" "}
            </g>
          </svg>

          <svg
          onClick={()=> resetAll()}
            data-tooltip-id="reset"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"
            />
          </svg>
        </div>

        <div className="input-setting">
          <div
            className="filter settings-class"
            style={{
              height: filterOpen ? "10rem" : "0",
              opacity: filterOpen ? "1" : "0",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">Filter</h2>
            <p className="setting-description">Diffs</p>

            <Select
              defaultValue={selectedFilterDiff}
              onChange={setSelectedFilterDiff}
              options={options}
              menuPortalTarget={document.body}
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                container: (provided) => ({
                  ...provided,
                  zIndex: 9999, // Set the z-index value as required
                }),
                control: (provided, state) => ({
                  ...provided,
                  width: "10rem", // Set the width
                  backgroundColor: "rgba(255, 255, 255, 0.3)", // Set the background color with opacity
                  border: "none", // Remove border
                  outline: "none", // Remove outline
                  boxShadow: state.isFocused
                    ? "0 0 0 2px #000000"
                    : provided.boxShadow, // Add border when focused
                  "&:hover": {
                    boxShadow: "none", // Remove box shadow on hover
                  },
                  singleValue: {
                    ...provided.singleValue,
                    color: "#FFFFFF !important", // Set the text color of the selected value to white
                  },
                  indicatorSeparator: {
                    ...provided.indicatorSeparator,
                    backgroundColor: "#000000", // Set the color of the indicator separator
                  },
                }),
                menu: (provided) => ({
                  ...provided,
                  width: "10rem", // Match the dropdown width with the control
                  backgroundColor: "rgb(255, 255, 255)", // Set the background color to white
                  border: "none", // Remove border
                  boxShadow: "none", // Remove box shadow
                  color: "#000000", // Set the text color to black
                  zIndex: 9999, // Set z-index for the menu
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? "#cccccc" : "transparent", // Highlight selected option with gray
                  zIndex: 9999, // Set z-index for the options
                }),
              }}
              placeholder="Disabled"
              isSearchable
              isClearable
              isDisabled
            />
          </div>

          <div
            className="sort settings-class"
            style={{
              height: sortOpen ? "10rem" : "0",
              opacity: sortOpen ? "1" : "0",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">Sort</h2>

            <div className="sort-option">
              <div className="recent">
                <p>Recent</p>
                <Tooltip id="ra" place="top" noArrow>
                  Recent Ascending
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  Recent Decending
                </Tooltip>

                <div className="wrapper">
                  <svg
                    style={{
                      backgroundColor:
                        sort == "RECENT_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => handleSort("RECENT_ASC")}
                    data-tooltip-id="ra"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {" "}
                      <path
                        d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                        fill="#ffffff"
                      ></path>{" "}
                      <path
                        d="M14 11.21C14.39 11.35 14.82 11.15 14.96 10.76L15.24 9.98001H17.27L17.55 10.76C17.66 11.07 17.95 11.26 18.26 11.26C18.34 11.26 18.43 11.25 18.51 11.22C18.9 11.08 19.1 10.65 18.96 10.26L17.25 5.47001C17.08 5.04001 16.69 4.76001 16.25 4.76001C15.81 4.76001 15.42 5.04001 15.25 5.49001L13.55 10.26C13.41 10.65 13.61 11.08 14 11.22V11.21ZM16.73 8.48001H15.77L16.25 7.14001L16.73 8.48001Z"
                        fill="#ffffff"
                      ></path>{" "}
                      <path
                        d="M18.67 13.46C18.48 13.02 18.08 12.75 17.62 12.75H14.51C14.1 12.75 13.76 13.09 13.76 13.5C13.76 13.91 14.1 14.25 14.51 14.25H16.9L14.07 17.2C13.73 17.56 13.64 18.08 13.83 18.54C14.02 18.98 14.42 19.25 14.88 19.25H18.01C18.42 19.25 18.76 18.91 18.76 18.5C18.76 18.09 18.42 17.75 18.01 17.75H15.62L18.44 14.82C18.78 14.46 18.88 13.93 18.68 13.47L18.67 13.46Z"
                        fill="#ffffff"
                      ></path>{" "}
                    </g>
                  </svg>

                  <svg
                    style={{
                      backgroundColor:
                        sort == "RECENT_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("RECENT_DESC")}
                    value="RECENT_DESC"
                    data-tooltip-id="rd"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {" "}
                      <path
                        d="M8.78 4.47C8.71 4.4 8.63 4.35 8.54 4.31C8.36 4.23 8.15 4.23 7.97 4.31C7.88 4.35 7.8 4.4 7.73 4.47L5.23 6.97C4.94 7.26 4.94 7.74 5.23 8.03C5.52 8.32 6 8.32 6.29 8.03L7.51 6.81V19C7.51 19.41 7.85 19.75 8.26 19.75C8.67 19.75 9.01 19.41 9.01 19V6.81L10.23 8.03C10.38 8.18 10.57 8.25 10.76 8.25C10.95 8.25 11.14 8.18 11.29 8.03C11.58 7.74 11.58 7.26 11.29 6.97L8.79 4.47H8.78Z"
                        fill="#ffffff"
                      ></path>{" "}
                      <path
                        d="M18.96 18.25L17.25 13.46C17.08 13.03 16.69 12.75 16.25 12.75C15.81 12.75 15.42 13.03 15.25 13.48L13.55 18.25C13.41 18.64 13.61 19.07 14 19.21C14.39 19.35 14.82 19.15 14.96 18.76L15.24 17.98H17.27L17.55 18.76C17.66 19.07 17.95 19.26 18.26 19.26C18.34 19.26 18.43 19.25 18.51 19.22C18.9 19.08 19.1 18.65 18.96 18.26V18.25ZM15.77 16.48L16.25 15.14L16.73 16.48H15.77Z"
                        fill="#ffffff"
                      ></path>{" "}
                      <path
                        d="M13.83 10.54C14.02 10.98 14.42 11.25 14.88 11.25H18.01C18.42 11.25 18.76 10.91 18.76 10.5C18.76 10.09 18.42 9.75001 18.01 9.75001H15.62L18.44 6.82001C18.78 6.46001 18.88 5.93001 18.68 5.47001C18.49 5.03001 18.09 4.76001 17.63 4.76001H14.52C14.11 4.76001 13.77 5.10001 13.77 5.51001C13.77 5.92001 14.11 6.26001 14.52 6.26001H16.91L14.08 9.21001C13.74 9.57001 13.65 10.09 13.84 10.55L13.83 10.54Z"
                        fill="#ffffff"
                      ></path>{" "}
                    </g>
                  </svg>
                </div>
              </div>

              <div className="diff">
                <p>Difficulty</p>

                <div className="wrapper">
                  <Tooltip id="da" place="top" noArrow>
                    Difficulty Ascending
                  </Tooltip>
                  <Tooltip id="dd" place="top" noArrow>
                    Difficulty Decending
                  </Tooltip>

                  <svg
                    style={{
                      backgroundColor:
                        sort == "DIFF_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="DIFF_ASC"
                    onClick={() => handleSort("DIFF_ASC")}
                    data-tooltip-id="da"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.38001 19.75C8.27987 19.7512 8.1805 19.7324 8.08775 19.6946C7.99501 19.6568 7.91077 19.6008 7.84001 19.53L5.34001 17C5.19956 16.8593 5.12067 16.6687 5.12067 16.47C5.12067 16.2712 5.19956 16.0806 5.34001 15.94C5.48357 15.8013 5.67539 15.7238 5.87501 15.7238C6.07462 15.7238 6.26644 15.8013 6.41001 15.94L8.41001 17.94L10.41 15.94C10.5536 15.8013 10.7454 15.7238 10.945 15.7238C11.1446 15.7238 11.3364 15.8013 11.48 15.94C11.6205 16.0806 11.6993 16.2712 11.6993 16.47C11.6993 16.6687 11.6205 16.8593 11.48 17L8.98001 19.5C8.90562 19.5846 8.8129 19.6511 8.70893 19.6944C8.60495 19.7377 8.49245 19.7567 8.38001 19.75Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M8.38001 19.75C8.18017 19.75 7.98836 19.6713 7.84611 19.5309C7.70387 19.3906 7.62264 19.1998 7.62001 19V5C7.62264 4.80017 7.70387 4.60942 7.84611 4.46905C7.98836 4.32868 8.18017 4.24998 8.38001 4.25C8.57718 4.25263 8.76539 4.33281 8.90389 4.47317C9.04238 4.61354 9.12003 4.80281 9.12001 5V19C9.12003 19.1972 9.04238 19.3865 8.90389 19.5268C8.76539 19.6672 8.57718 19.7474 8.38001 19.75Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M17.12 19.2499C16.9228 19.2473 16.7346 19.1671 16.5961 19.0268C16.4576 18.8864 16.38 18.6971 16.38 18.4999V14.4399L15.99 14.6599C15.815 14.7567 15.6086 14.78 15.4164 14.7247C15.2242 14.6694 15.0618 14.54 14.965 14.3649C14.8682 14.1899 14.8449 13.9836 14.9002 13.7913C14.9555 13.5991 15.085 13.4367 15.26 13.3399L15.92 12.9799C16.0943 12.8527 16.2999 12.7753 16.5148 12.7559C16.7297 12.7365 16.9458 12.7759 17.14 12.8699C17.3633 12.9752 17.5518 13.1423 17.683 13.3515C17.8141 13.5606 17.8825 13.8031 17.88 14.0499V18.4999C17.8774 18.6998 17.7962 18.8905 17.6539 19.0309C17.5117 19.1713 17.3199 19.25 17.12 19.2499Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.62 9.24998C16.1754 9.248 15.7414 9.11437 15.3727 8.86593C15.004 8.6175 14.7172 8.26541 14.5484 7.85411C14.3797 7.44281 14.3365 6.99072 14.4245 6.55493C14.5124 6.11913 14.7275 5.71916 15.0425 5.40549C15.3576 5.09182 15.7585 4.87852 16.1947 4.79251C16.6309 4.7065 17.0828 4.75164 17.4933 4.92222C17.9039 5.09281 18.2547 5.3812 18.5015 5.75099C18.7483 6.12078 18.88 6.5554 18.88 6.99998C18.8813 7.29667 18.8237 7.59067 18.7105 7.86491C18.5973 8.13915 18.4307 8.38817 18.2204 8.5975C18.0102 8.80683 17.7604 8.9723 17.4857 9.08431C17.2109 9.19632 16.9167 9.25263 16.62 9.24998ZM16.62 6.24998C16.4211 6.24998 16.2303 6.329 16.0897 6.46965C15.949 6.6103 15.87 6.80107 15.87 6.99998C15.87 7.19889 15.949 7.38966 16.0897 7.53031C16.2303 7.67096 16.4211 7.74998 16.62 7.74998C16.8189 7.74998 17.0097 7.67096 17.1503 7.53031C17.291 7.38966 17.37 7.19889 17.37 6.99998C17.37 6.80107 17.291 6.6103 17.1503 6.46965C17.0097 6.329 16.8189 6.24998 16.62 6.24998Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.11 11.25H15.62C15.4211 11.25 15.2303 11.171 15.0897 11.0303C14.949 10.8897 14.87 10.6989 14.87 10.5C14.87 10.3011 14.949 10.1103 15.0897 9.96967C15.2303 9.82902 15.4211 9.75 15.62 9.75H16.11C16.4293 9.7433 16.7345 9.61752 16.9657 9.39735C17.197 9.17719 17.3376 8.87853 17.36 8.56C17.36 8.27 17.36 7.92 17.36 7.5V7C17.36 6.80281 17.4376 6.61354 17.5761 6.47317C17.7146 6.33281 17.9028 6.25263 18.1 6.25C18.2999 6.24998 18.4917 6.32868 18.6339 6.46905C18.7761 6.60942 18.8574 6.80017 18.86 7V7.5C18.86 7.95 18.86 8.32 18.86 8.64C18.817 9.34229 18.5093 10.0022 17.999 10.4865C17.4886 10.9709 16.8136 11.2437 16.11 11.25Z"
                      fill="#ffffff"
                    />
                  </svg>

                  <svg
                    style={{
                      backgroundColor:
                        sort == "DIFF_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("DIFF_DESC")}
                    value="DIFF_DESC"
                    data-tooltip-id="dd"
                    width="800px"
                    height="800px"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.75 8.24994C10.56 8.24994 10.37 8.17994 10.22 8.02994L8.25 6.05994L6.28 8.02994C5.99 8.31994 5.51 8.31994 5.22 8.02994C4.93 7.73994 4.93 7.25994 5.22 6.96994L7.72 4.46994C8.01 4.17994 8.49 4.17994 8.78 4.46994L11.28 6.96994C11.57 7.25994 11.57 7.73994 11.28 8.02994C11.13 8.17994 10.94 8.24994 10.75 8.24994Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M8.25 19.75C7.84 19.75 7.5 19.41 7.5 19V5C7.5 4.59 7.84 4.25 8.25 4.25C8.66 4.25 9 4.59 9 5V19C9 19.41 8.66 19.75 8.25 19.75Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M17 11.25C16.59 11.25 16.25 10.91 16.25 10.5V6.43997L15.86 6.64997C15.49 6.84997 15.04 6.71997 14.84 6.35997C14.64 5.99997 14.77 5.53997 15.13 5.33997L15.78 4.97997C16.14 4.71997 16.6 4.67997 17 4.85997C17.45 5.06997 17.74 5.52997 17.74 6.04997V10.5C17.74 10.91 17.4 11.25 16.99 11.25H17Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.5 17.25C15.26 17.25 14.25 16.24 14.25 15C14.25 13.76 15.26 12.75 16.5 12.75C17.74 12.75 18.75 13.76 18.75 15C18.75 16.24 17.74 17.25 16.5 17.25ZM16.5 14.25C16.09 14.25 15.75 14.59 15.75 15C15.75 15.41 16.09 15.75 16.5 15.75C16.91 15.75 17.25 15.41 17.25 15C17.25 14.59 16.91 14.25 16.5 14.25Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M15.98 19.25H15.5C15.09 19.25 14.75 18.91 14.75 18.5C14.75 18.09 15.09 17.75 15.5 17.75H15.98C16.63 17.75 17.2 17.21 17.23 16.56C17.24 16.27 17.24 15.92 17.24 15.5V15C17.24 14.59 17.58 14.25 17.99 14.25C18.4 14.25 18.74 14.59 18.74 15V15.5C18.74 15.95 18.74 16.32 18.72 16.64C18.65 18.08 17.41 19.25 15.97 19.25H15.98Z"
                      fill="#ffffff"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <InfiniteScroll
        style={{paddingBottom:"5rem"}}
          dataLength={levels.length}
          next={() => setPageNumber((prevPageNumber) => prevPageNumber + 1)}
          hasMore={hasMore}
          loader={<h1>Loading...</h1>}
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>You have seen it all</b>
            </p>
          }
        >
          {levels.map((l, index) => (
            <LevelCardRev
              key={index}
              creator={l.creator}
              diff="25"
              id={l.id}
              artist={l.artist}
              song={l.song}
              clears={l.clears}
              dl={l.dlLink}
              ws={l.wsLink}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default LevelPageRev;
