import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Home } from "./pages/Home";
import { Regions } from "./pages/Regions";
import { RegionHome } from "./pages/RegionHome";
import { Report } from "./pages/Report";
import { Learn } from "./pages/Learn";
import { Floods } from "./pages/Floods";
import { FloodDetail } from "./pages/FloodDetail";
import { WaterBodyDetail } from "./pages/WaterBodyDetail";
import { ReportDetail } from "./pages/ReportDetail";
import { Alerts } from "./pages/Alerts";
import { Account } from "./pages/Account";
import { Authority } from "./pages/Authority";
import { Authorities } from "./pages/Authorities";
import { AuthorityProfile } from "./pages/AuthorityProfile";
import { Volunteers } from "./pages/Volunteers";
import { Cleaners } from "./pages/Cleaners";
import { VolunteerProfile } from "./pages/VolunteerProfile";
import { CreateEvent } from "./pages/CreateEvent";
import { EditProfile } from "./pages/EditProfile";
import { CreatePost } from "./pages/CreatePost";
import { EventDetail } from "./pages/EventDetail";
import { Messages } from "./pages/Messages";
import { MessageThread } from "./pages/MessageThread";
import { HowItWorks } from "./pages/HowItWorks";

export function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/regions" element={<Regions />} />
        <Route path="/region" element={<RegionHome />} />
        <Route path="/report" element={<Report />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/floods" element={<Floods />} />
        <Route path="/floods/:floodId" element={<FloodDetail />} />
        <Route path="/waterbody/:waterBodyId" element={<WaterBodyDetail />} />
        <Route path="/reports/:reportId" element={<ReportDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/account" element={<Account />} />
        <Route path="/authority" element={<Authority />} />
        <Route path="/authorities" element={<Authorities />} />
        <Route path="/authorities/:authorityId" element={<AuthorityProfile />} />
        <Route path="/volunteers" element={<Volunteers />} />
        <Route path="/volunteers/me/edit" element={<EditProfile />} />
        <Route path="/volunteers/:volunteerId" element={<VolunteerProfile />} />
        <Route path="/cleaners" element={<Cleaners />} />
        <Route path="/cleaners/:cleanerId" element={<VolunteerProfile />} />
        <Route path="/events/new" element={<CreateEvent />} />
        <Route path="/events/:talukId/:date/:eventId" element={<EventDetail />} />
        <Route path="/posts/new" element={<CreatePost />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<MessageThread />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Routes>
      <footer className="footer">
        <div className="container">
          <div>WaterWatch — protect, conserve, and respond to water safety. Report anonymously, act together.</div>
          <div style={{ marginTop: 8 }}>
            <a href="/how-it-works">How it works</a> · <a href="/alerts">Community alerts</a> · <a href="/report">Report a problem</a>
          </div>
        </div>
      </footer>
    </>
  );
}
