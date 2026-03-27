const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get all events (public)
// @route   GET /api/events
const getEvents = async (req, res) => {
  try {
    const events = await Event.find({});
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single event by eventId (public)
// @route   GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.id }).populate('hallLayout');
    if (event) res.json(event);
    else res.status(404).json({ message: 'Event not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates a new event
// @route   POST /api/events
const createEvent = async (req, res) => {
  try {
    const {
      name, collegeName, collegeDomain, city, venue,
      dateTime, capacity, description, topics, speakers, agenda, hallLayoutId
    } = req.body;

    if (!name || !collegeName || !collegeDomain || !city || !venue || !dateTime || !capacity) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Auto-generate eventId
    const count = await Event.countDocuments();
    const eventId = `evt-${String(count + 1).padStart(3, '0')}`;

    const event = await Event.create({
      eventId, name, collegeName, collegeDomain, city, venue,
      dateTime: new Date(dateTime), capacity: Number(capacity),
      description, topics: topics || [],
      speakers: speakers || [], agenda: agenda || [],
      createdBy: req.user._id,
      ...(hallLayoutId ? { hallLayout: hallLayoutId } : {}),
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get events created by this admin
// @route   GET /api/events/mine
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Live dashboard stats for one event (admin)
// @route   GET /api/events/dashboard/:eventId
const getEventDashboard = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId }).populate('createdBy', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json({
      name: event.name, collegeName: event.collegeName, venue: event.venue,
      dateTime: event.dateTime, capacity: event.capacity, status: event.status,
      registeredCount: event.registeredCount, waitlistCount: event.waitlistCount,
      checkedInCount: event.checkedInCount,
      remainingSeats: Math.max(0, event.capacity - event.registeredCount),
      fillRate: Math.round((event.registeredCount / event.capacity) * 100),
      checkInRate: event.registeredCount > 0
        ? Math.round((event.checkedInCount / event.registeredCount) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark event as COMPLETED
// @route   PATCH /api/events/:eventId/complete
const markEventCompleted = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Not authorized for this event' });
    }
    event.status = 'COMPLETED';
    await event.save();
    res.json({ message: 'Event marked as completed', status: event.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin analytics summary
// @route   GET /api/events/analytics
const getAdminAnalytics = async (req, res) => {
  try {
    const filter = req.user.role === 'superAdmin' ? {} : { createdBy: req.user._id };
    const myEvents = await Event.find(filter);
    const eventIds = myEvents.map(e => e._id);

    const upcoming = myEvents.filter(e => e.status === 'UPCOMING' && e.registeredCount < e.capacity).length;
    const soldOut  = myEvents.filter(e => e.status === 'UPCOMING' && e.registeredCount >= e.capacity).length;
    const completed = myEvents.filter(e => e.status === 'COMPLETED').length;

    const totalRegistrations = myEvents.reduce((s, e) => s + e.registeredCount, 0);
    const totalCheckins = myEvents.reduce((s, e) => s + e.checkedInCount, 0);
    const totalWaitlist = myEvents.reduce((s, e) => s + e.waitlistCount, 0);
    const totalRevenue = myEvents.reduce((s, e) => s + (e.registeredCount * (e.amount || 0)), 0);

    // Top cities
    const cityMap = {};
    myEvents.forEach(e => { cityMap[e.city] = (cityMap[e.city] || 0) + e.registeredCount; });
    const topCities = Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    // Recent registrations (last 10)
    const recentRegs = await Registration.find({ event: { $in: eventIds } })
      .sort({ createdAt: -1 }).limit(10)
      .populate('user', 'name email college')
      .populate('event', 'name collegeName');

    const recentActivity = recentRegs.map(r => ({
      type: r.status === 'CHECKED_IN' ? 'checkin' : 'registration',
      studentName: r.user?.name || 'Unknown',
      studentEmail: r.user?.email || '',
      college: r.user?.college || '',
      eventName: r.event?.name || '',
      status: r.status,
      time: r.updatedAt || r.createdAt,
    }));

    res.json({
      summary: {
        totalEvents: myEvents.length, upcoming, soldOut, completed,
        totalRegistrations, totalCheckins, totalWaitlist, totalRevenue,
        checkInRate: totalRegistrations > 0 ? Math.round((totalCheckins / totalRegistrations) * 100) : 0,
      },
      topCities,
      recentActivity,
      events: myEvents.map(e => ({
        eventId: e.eventId, name: e.name, city: e.city, status: e.status,
        registeredCount: e.registeredCount, capacity: e.capacity,
        checkedInCount: e.checkedInCount, waitlistCount: e.waitlistCount,
        dateTime: e.dateTime, amount: e.amount || 0,
        revenue: e.registeredCount * (e.amount || 0),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Admin attaches a hall layout to an existing event
// @route PATCH /api/events/:eventId/hall
const attachHallLayout = async (req, res) => {
  try {
    const { hallLayoutId } = req.body;
    if (!hallLayoutId) return res.status(400).json({ message: 'hallLayoutId is required' });
    const event = await Event.findOneAndUpdate(
      { eventId: req.params.eventId },
      { hallLayout: hallLayoutId },
      { new: true }
    ).populate('hallLayout');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all participants for an event (admin)
// @route GET /api/events/:eventId/participants
const getParticipants = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const regs = await Registration.find({ event: event._id })
      .populate('user', 'name email phone college year discipline')
      .sort({ createdAt: -1 })
      .lean();

    const total      = regs.length;
    const registered = regs.filter(r => r.status === 'REGISTERED').length;
    const waitlisted = regs.filter(r => r.status === 'WAITLISTED').length;
    const checkedIn  = regs.filter(r => r.status === 'CHECKED_IN').length;
    const noShow     = registered - checkedIn;

    res.json({
      event: {
        eventId: event.eventId, name: event.name, capacity: event.capacity,
        status: event.status, venue: event.venue, dateTime: event.dateTime,
      },
      stats: { total, registered, waitlisted, checkedIn, noShow },
      participants: regs.map(r => ({
        _id: r._id,
        name:       r.user?.name       || 'N/A',
        email:      r.user?.email      || 'N/A',
        phone:      r.user?.phone      || 'N/A',
        college:    r.user?.college    || 'N/A',
        year:       r.user?.year       || 'N/A',
        discipline: r.user?.discipline || 'N/A',
        status:     r.status,
        checkedIn:  r.checkedIn,
        checkedInAt: r.checkedInAt,
        registeredAt: r.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Export participants as CSV (admin)
// @route GET /api/events/:eventId/export
const exportCSV = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const regs = await Registration.find({ event: event._id })
      .populate('user', 'name email phone college year discipline')
      .sort({ createdAt: -1 })
      .lean();

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name','Email','Phone','College','Year','Discipline','Status','Registered At','Checked-in At'];
    const rows = regs.map(r => [
      escape(r.user?.name),
      escape(r.user?.email),
      escape(r.user?.phone),
      escape(r.user?.college),
      escape(r.user?.year),
      escape(r.user?.discipline),
      escape(r.status),
      escape(r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : ''),
      escape(r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('en-IN') : ''),
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const filename = `participants-${event.eventId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update event details (admin)
// @route PUT /api/events/:eventId
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const allowed = ['name','collegeName','collegeDomain','city','venue','dateTime','capacity','description','topics','speakers','agenda','status','amount'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete event (admin)
// @route DELETE /api/events/:eventId
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    await Registration.deleteMany({ event: event._id });
    await Event.deleteOne({ _id: event._id });
    res.json({ message: 'Event and all registrations deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Start / stop check-in for event (admin)
// @route PATCH /api/events/:eventId/checkin-start
const startCheckin = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.checkInStarted = !event.checkInStarted;
    await event.save();
    res.json({ checkInStarted: event.checkInStarted, message: event.checkInStarted ? 'Check-in started' : 'Check-in stopped' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get distinct colleges from UPCOMING events (public — used on signup form)
// @route GET /api/events/colleges
const getEventColleges = async (req, res) => {
  try {
    const events = await Event.find({ status: 'UPCOMING' })
      .select('collegeName city collegeDomain -_id')
      .lean();

    // Deduplicate by collegeName
    const seen = new Set();
    const colleges = [];
    for (const e of events) {
      if (!seen.has(e.collegeName)) {
        seen.add(e.collegeName);
        colleges.push({ collegeName: e.collegeName, city: e.city, collegeDomain: e.collegeDomain });
      }
    }

    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, getMyEvents, getEventDashboard, markEventCompleted, getAdminAnalytics, attachHallLayout, getParticipants, exportCSV, updateEvent, deleteEvent, startCheckin, getEventColleges };

