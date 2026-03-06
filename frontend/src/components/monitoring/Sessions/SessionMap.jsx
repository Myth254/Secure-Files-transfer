import React from "react";
import { FiMapPin } from "react-icons/fi";

// This is a simplified map component - in production, you'd use a library like react-leaflet or @react-google-maps/api
const SessionMap = ({ sessions }) => {
  // Group sessions by country
  const countryGroups = sessions?.reduce((acc, session) => {
    const country = session.client?.country || "Unknown";
    if (!acc[country]) {
      acc[country] = {
        count: 0,
        cities: new Set(),
        sessions: [],
      };
    }
    acc[country].count++;
    if (session.client?.city) {
      acc[country].cities.add(session.client.city);
    }
    acc[country].sessions.push(session);
    return acc;
  }, {});

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <FiMapPin className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          No location data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map placeholder - in production, integrate with actual map service */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
        <div className="text-center">
          <FiMapPin className="mx-auto h-12 w-12 text-primary-600 dark:text-primary-400 mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            Map visualization would appear here
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {sessions.length} active sessions across{" "}
            {Object.keys(countryGroups).length} countries
          </p>
        </div>
      </div>

      {/* Country list */}
      <div className="space-y-3">
        {Object.entries(countryGroups).map(([country, data]) => (
          <div
            key={country}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FiMapPin className="h-4 w-4 text-primary-600 dark:text-primary-400 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {country}
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {data.count} session{data.count !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="pl-6 space-y-1">
              {Array.from(data.cities).map((city) => (
                <div
                  key={city}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {city}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {
                      data.sessions.filter((s) => s.client?.city === city)
                        .length
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionMap;
